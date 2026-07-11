const GAME_WIDTH = 1000;
const GAME_HEIGHT = 600;

const GRAVITY = 0.35;
const AIR_FRICTION = 0.995;
const TABLE_BOUNCE = 0.85;
const RACKET_POWER = 0.5;
const MAX_BALL_SPEED = 22;

const BALL_RADIUS = 12;
const RACKET_RADIUS = 40;

const TABLE_Y = 450;
const TABLE_LEFT = 100;
const TABLE_RIGHT = 900;
const NET_X = GAME_WIDTH / 2;
const NET_TOP = 370;

const MAX_SCORE = 5;
const PHYSICS_SUBSTEPS = 4;       // <-- FIX: prevents tunnelling

export default class TableTennisGame {
  constructor(roomId, io) {
    this.roomId = roomId;
    this.io = io;
    this.players = {};
    this.gameInterval = null;
    this.countdownInterval = null;
    this.destroyTimeout = null;

    this.prevPaddles = {
      p1: { x: 150, y: 300 },
      p2: { x: 850, y: 300 },
    };

    this.resetGameState();
  }

  resetGameState() {
    this.state = {
      status: 'waiting',
      score: { p1: 0, p2: 0 },
      winner: null,
      ball: { x: GAME_WIDTH / 2, y: 100, vx: 0, vy: 0 },
      paddles: {
        p1: { x: 150, y: 300 },
        p2: { x: 850, y: 300 },
      },
      dimensions: { width: GAME_WIDTH, height: GAME_HEIGHT },
      timestamp: Date.now(),
    };
  }

  addPlayer(socketId, playerId) {
    if (this.destroyTimeout) {
      clearTimeout(this.destroyTimeout);
      this.destroyTimeout = null;
    }
    if (this.players[socketId] || Object.keys(this.players).length >= 2) return false;

    const role = Object.keys(this.players).length === 0 ? 'p1' : 'p2';
    this.players[socketId] = { id: playerId, role };
    this.io.to(socketId).emit('tt:role', { role });

    if (Object.keys(this.players).length === 2) {
      this.startCountdown();
    }
    return true;
  }

  removePlayer(socketId) {
    delete this.players[socketId];
    this.state.status = 'waiting';
    this.io.to(this.roomId).emit('tt:playerDisconnected');
    this.destroyTimeout = setTimeout(() => this.destroy(), 10000);
  }

  destroy() {
    if (this.gameInterval) clearInterval(this.gameInterval);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }

  broadcastState() {
    this.state.timestamp = Date.now();
    this.io.to(this.roomId).emit('tt:gameState', this.state);
  }

  startCountdown() {
    this.state.status = 'countdown';
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.resetBall();
    this.broadcastState();

    let count = 3;
    this.countdownInterval = setInterval(() => {
      count--;
      this.io.to(this.roomId).emit('tt:countdown', count);
      if (count === 0) {
        clearInterval(this.countdownInterval);
        this.state.status = 'playing';
        this.startGameLoop();
      }
    }, 1000);
  }

  startGameLoop() {
    if (this.gameInterval) clearInterval(this.gameInterval);
    this.gameInterval = setInterval(() => {
      if (this.state.status !== 'playing') return;
      this.updatePhysics();
      this.broadcastState();

      this.prevPaddles.p1 = { ...this.state.paddles.p1 };
      this.prevPaddles.p2 = { ...this.state.paddles.p2 };
    }, 1000 / 60);
  }

  updatePhysics() {
    const dt = 1 / 60 / PHYSICS_SUBSTEPS;   // sub‑step size

    for (let step = 0; step < PHYSICS_SUBSTEPS; step++) {
      const ball = this.state.ball;

      // Gravity & friction
      ball.vy += GRAVITY * dt;
      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;
      ball.vx *= AIR_FRICTION ** (1 / PHYSICS_SUBSTEPS);
      ball.vy *= AIR_FRICTION ** (1 / PHYSICS_SUBSTEPS);

      // Walls
      if (ball.x - BALL_RADIUS <= 0) {
        ball.vx = Math.abs(ball.vx);
        ball.x = BALL_RADIUS;
      }
      if (ball.x + BALL_RADIUS >= GAME_WIDTH) {
        ball.vx = -Math.abs(ball.vx);
        ball.x = GAME_WIDTH - BALL_RADIUS;
      }
      if (ball.y - BALL_RADIUS <= 0) {
        ball.vy = Math.abs(ball.vy);
        ball.y = BALL_RADIUS;
      }

      // Table collision
      if (ball.y + BALL_RADIUS >= TABLE_Y && ball.y < TABLE_Y + 20) {
        if (ball.x > TABLE_LEFT && ball.x < TABLE_RIGHT) {
          ball.y = TABLE_Y - BALL_RADIUS;
          ball.vy = -Math.abs(ball.vy) * TABLE_BOUNCE;
        }
      }

      // Net collision
      if (ball.x + BALL_RADIUS > NET_X - 5 && ball.x - BALL_RADIUS < NET_X + 5) {
        if (ball.y > NET_TOP && ball.y < TABLE_Y) {
          ball.vx = ball.x < NET_X ? -Math.abs(ball.vx) : Math.abs(ball.vx);
        } else if (ball.y + BALL_RADIUS > NET_TOP - 5 && ball.y < NET_TOP + 5) {
          ball.vy = -Math.abs(ball.vy) * 0.8;
        }
      }

      // Floor (scoring)
      if (ball.y > GAME_HEIGHT + BALL_RADIUS) {
        if (ball.x < NET_X) {
          this.handleGoal('p2');
        } else {
          this.handleGoal('p1');
        }
        return;   // stop sub‑steps, countdown restarts
      }

      // Racket collisions (run once per sub‑step)
      this.checkRacketCollision('p1');
      this.checkRacketCollision('p2');
    }
  }

  checkRacketCollision(role) {
    const racket = this.state.paddles[role];
    const prev = this.prevPaddles[role];
    const ball = this.state.ball;

    const rVx = racket.x - prev.x;
    const rVy = racket.y - prev.y;
    const dx = ball.x - racket.x;
    const dy = ball.y - racket.y;
    const dist = Math.hypot(dx, dy);

    if (dist < BALL_RADIUS + RACKET_RADIUS) {
      const overlap = (BALL_RADIUS + RACKET_RADIUS) - dist;
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);

      ball.x += nx * overlap;
      ball.y += ny * overlap;

      const speed = Math.hypot(ball.vx, ball.vy);
      const newSpeed = Math.min(speed * 0.8 + Math.hypot(rVx, rVy) * RACKET_POWER, MAX_BALL_SPEED);
      ball.vx = nx * newSpeed;
      ball.vy = ny * newSpeed;

      if (role === 'p1' && ball.vx < 2) ball.vx = 4;
      if (role === 'p2' && ball.vx > -2) ball.vx = -4;
    }
  }

  handleGoal(scorer) {
    this.state.score[scorer]++;
    if (this.state.score[scorer] >= MAX_SCORE) {
      this.state.status = 'finished';
      this.state.winner = scorer;
      this.broadcastState();
      if (this.gameInterval) clearInterval(this.gameInterval);
    } else {
      this.startCountdown();
    }
  }

  resetBall() {
    const side = Math.random() > 0.5 ? -100 : 100;
    this.state.ball = {
      x: (GAME_WIDTH / 2) + side,
      y: 50,
      vx: 0,
      vy: 2,
    };
  }

  handlePlayerMove(socketId, pos) {
    const player = this.players[socketId];
    if (!player || this.state.status !== 'playing') return;
    if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') return;

    const racket = this.state.paddles[player.role];

    if (player.role === 'p1') {
      racket.x = Math.max(RACKET_RADIUS, Math.min(NET_X - RACKET_RADIUS, pos.x));
    } else {
      racket.x = Math.max(NET_X + RACKET_RADIUS, Math.min(GAME_WIDTH - RACKET_RADIUS, pos.x));
    }
    racket.y = Math.max(RACKET_RADIUS, Math.min(GAME_HEIGHT - RACKET_RADIUS, pos.y));
  }

  handleRematch() {
    this.resetGameState();
    this.startCountdown();
  }
}