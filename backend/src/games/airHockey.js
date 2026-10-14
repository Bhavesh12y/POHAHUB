import {
  TABLE,
  createTableState,
  resetAfterGoal,
  clampStriker,
  stepTable,
  puckHalf,
  isPlausiblePuck,
  isInGoalMouth,
} from './airHockeyPhysics.js';

const { HEIGHT, PUCK_RADIUS, MAX_SCORE } = TABLE;
const TICK_MS = 1000 / 60;
const SNAPSHOT_MS = 1000 / 30;
// If the puck owner stops reporting for this long, the server simulates the puck itself.
const AUTHORITY_TIMEOUT_MS = 250;
const GOAL_PAUSE_MS = 1100;

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Online air hockey match.
 *
 * The player whose half the puck is on simulates it locally (instant hits) and
 * reports it here. The server validates every report, decides goals and keeps
 * score, and takes over the puck whenever the owner goes quiet.
 */
export default class AirHockeyGame {
  constructor(roomId, io) {
    this.roomId = roomId;
    this.io = io;
    this.roles = { p1: null, p2: null }; // role -> socketId
    this.loop = null;
    this.snapshotLoop = null;
    this.timers = new Set();
    this.destroyTimeout = null;
    this.resetGameState();
  }

  resetGameState() {
    this.state = { status: 'waiting', score: { p1: 0, p2: 0 }, winner: null, ...createTableState() };
    this.targets = { p1: { ...this.state.strikers.p1 }, p2: { ...this.state.strikers.p2 } };
    this.authority = null;
    this.lastPuckUpdate = 0;
    this.lastPuckReport = 0;
    this.nextKickoffConceder = null;
  }

  later(fn, ms) {
    const handle = setTimeout(() => {
      this.timers.delete(handle);
      fn();
    }, ms);
    this.timers.add(handle);
  }

  clearTimers() {
    this.timers.forEach(clearTimeout);
    this.timers.clear();
  }

  roleOf(socketId) {
    if (this.roles.p1 === socketId) return 'p1';
    if (this.roles.p2 === socketId) return 'p2';
    return null;
  }

  playerCount() {
    return Number(Boolean(this.roles.p1)) + Number(Boolean(this.roles.p2));
  }

  addPlayer(socketId) {
    if (this.destroyTimeout) {
      clearTimeout(this.destroyTimeout);
      this.destroyTimeout = null;
    }

    let role = this.roleOf(socketId);
    if (!role) {
      role = !this.roles.p1 ? 'p1' : !this.roles.p2 ? 'p2' : null;
      if (!role) return false;
      this.roles[role] = socketId;
    }

    this.io.to(socketId).emit('airHockeyRole', { role });
    this.emitState();

    if (this.playerCount() === 2 && ['waiting', 'paused'].includes(this.state.status)) {
      this.startCountdown();
    }
    return true;
  }

  removePlayer(socketId) {
    const role = this.roleOf(socketId);
    if (!role) return;
    this.roles[role] = null;

    if (this.state.status !== 'finished') {
      this.clearTimers();
      this.state.status = 'paused';
      this.authority = null;
      this.emitState();
    }
    this.io.to(this.roomId).emit('playerDisconnected');

    if (this.playerCount() === 0) {
      this.destroyTimeout = setTimeout(() => this.destroy(), 10000);
    }
  }

  destroy() {
    if (this.loop) clearInterval(this.loop);
    if (this.snapshotLoop) clearInterval(this.snapshotLoop);
    this.loop = null;
    this.snapshotLoop = null;
    this.clearTimers();
  }

  publicState() {
    return {
      status: this.state.status,
      score: this.state.score,
      winner: this.state.winner,
      puck: this.state.puck,
      strikers: this.state.strikers,
    };
  }

  // Low-frequency full state for status / score changes.
  emitState() {
    this.io.to(this.roomId).emit('gameState', this.publicState());
  }

  // High-frequency compact snapshot. Volatile: dropped rather than queued when a client lags.
  emitSnapshot() {
    const { puck, strikers } = this.state;
    this.io.to(this.roomId).volatile.emit('ah:snap', {
      t: Date.now(),
      st: this.state.status,
      au: this.authority,
      p: [round1(puck.x), round1(puck.y), round1(puck.vx), round1(puck.vy)],
      s: [round1(strikers.p1.x), round1(strikers.p1.y), round1(strikers.p2.x), round1(strikers.p2.y)],
    });
  }

  ensureLoops() {
    if (this.loop) return;
    this.lastTick = Date.now();
    this.loop = setInterval(() => this.tick(), TICK_MS);
    this.snapshotLoop = setInterval(() => {
      if (['countdown', 'playing', 'goal'].includes(this.state.status)) this.emitSnapshot();
    }, SNAPSHOT_MS);
  }

  startCountdown() {
    this.clearTimers();
    resetAfterGoal(this.state, this.nextKickoffConceder);
    this.targets = { p1: { ...this.state.strikers.p1 }, p2: { ...this.state.strikers.p2 } };
    this.authority = puckHalf(this.state.puck);
    this.lastPuckUpdate = 0;
    this.state.status = 'countdown';
    this.emitState();
    this.ensureLoops();

    let count = 3;
    this.io.to(this.roomId).emit('countdown', count);
    const step = () => {
      count -= 1;
      this.io.to(this.roomId).emit('countdown', count);
      if (count <= 0) {
        this.state.status = 'playing';
        this.emitState();
      } else {
        this.later(step, 800);
      }
    };
    this.later(step, 800);
  }

  tick() {
    const now = Date.now();
    const dt = Math.min(0.05, (now - this.lastTick) / 1000);
    this.lastTick = now;
    if (dt <= 0) return;

    const status = this.state.status;
    if (!['countdown', 'playing', 'goal'].includes(status)) return;

    const ownerActive = this.authority && now - this.lastPuckUpdate < AUTHORITY_TIMEOUT_MS;
    const simulatePuck = status === 'playing' && !ownerActive;
    const events = stepTable(this.state, this.targets, dt, { simulatePuck });

    if (simulatePuck) {
      if (events.goal) {
        this.handleGoal(events.goal);
        return;
      }
      this.authority = puckHalf(this.state.puck, this.authority);
    }
  }

  handlePlayerMove(socketId, position) {
    const role = this.roleOf(socketId);
    if (!role || !position || !Number.isFinite(position.x) || !Number.isFinite(position.y)) return;
    this.targets[role] = clampStriker(role, position);
  }

  handlePuckUpdate(socketId, report) {
    const role = this.roleOf(socketId);
    if (!role || this.state.status !== 'playing' || !report) return;

    const now = Date.now();
    const puck = { x: +report.x, y: +report.y, vx: +report.vx, vy: +report.vy };

    // Only the current owner, or a player claiming a puck on their own half, may report.
    const half = puckHalf(puck, role);
    if (role !== this.authority && half !== role) return;
    if (!isPlausiblePuck(puck, this.state.puck, (now - this.lastPuckReport) / 1000)) return;

    this.state.puck = puck;
    this.lastPuckReport = now;

    if (puck.y - PUCK_RADIUS <= 0 && isInGoalMouth(puck.x)) return this.handleGoal('p1');
    if (puck.y + PUCK_RADIUS >= HEIGHT && isInGoalMouth(puck.x)) return this.handleGoal('p2');

    if (half === role) {
      this.authority = role;
      this.lastPuckUpdate = now;
    } else {
      // Handoff: the puck crossed the centre line. The server carries it until
      // the other player's first report arrives.
      this.authority = half;
      this.lastPuckUpdate = 0;
    }
  }

  handleGoal(scorer) {
    if (this.state.status !== 'playing') return;
    this.state.score[scorer] += 1;
    this.authority = null;
    this.nextKickoffConceder = scorer === 'p1' ? 'p2' : 'p1';

    if (this.state.score[scorer] >= MAX_SCORE) {
      this.state.status = 'finished';
      this.state.winner = scorer;
      this.emitState();
      this.io.to(this.roomId).emit('gameOver', this.publicState());
      return;
    }

    this.state.status = 'goal';
    this.emitState();
    this.io.to(this.roomId).emit('goalAnimation', scorer);
    this.later(() => {
      if (this.playerCount() === 2) this.startCountdown();
      else this.state.status = 'paused';
    }, GOAL_PAUSE_MS);
  }

  handleRematch() {
    this.clearTimers();
    const roles = this.roles;
    this.resetGameState();
    this.roles = roles;
    this.emitState();
    if (this.playerCount() === 2) this.startCountdown();
  }
}
