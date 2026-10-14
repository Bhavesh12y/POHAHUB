import { useEffect, useState } from 'react';
import {
  TABLE,
  createTableState,
  clampStriker,
  stepTable,
  puckHalf,
  strikerHome,
} from '@engines/airHockeyPhysics.js';
import { connectSocket } from '../../lib/socket.js';
import { createRenderer, pointerToTable } from './renderer.js';

const INTERP_DELAY_MS = 100; // opponent + remote puck are drawn this far in the past
const SEND_MOVE_MS = 16;
const SEND_PUCK_MS = 33;
const GOAL_DROP_MS = 450;
const PENDING_GOAL_TIMEOUT_MS = 900;

const lerp = (a, b, t) => a + (b - a) * t;

function parseSnapshot(raw) {
  return {
    t: raw.t,
    status: raw.st,
    authority: raw.au,
    puck: { x: raw.p[0], y: raw.p[1], vx: raw.p[2], vy: raw.p[3] },
    strikers: { p1: { x: raw.s[0], y: raw.s[1] }, p2: { x: raw.s[2], y: raw.s[3] } },
  };
}

/**
 * Networked air hockey client.
 *
 * - Own striker: drawn at your finger immediately.
 * - Puck on your half: simulated on this device with the shared physics and
 *   reported to the server, so hits react on the next frame.
 * - Opponent and puck on their half: interpolated from a short snapshot buffer.
 */
export function useAirHockeyOnline({ canvasRef, roomCode, active }) {
  const [ui, setUi] = useState({ score: { p1: 0, p2: 0 }, status: 'waiting', winner: null });
  const [countdown, setCountdown] = useState(null);
  const [goalBy, setGoalBy] = useState(null);
  const [myRole, setMyRole] = useState(null);

  useEffect(() => {
    if (!active || !canvasRef.current) return undefined;

    const socket = connectSocket();
    const canvas = canvasRef.current;
    const renderer = createRenderer(canvas);
    const local = createTableState();
    const snapshots = [];
    const trail = [];

    let role = null;
    let status = 'waiting';
    let clockOffset = null; // client receive time minus server send time (minimum seen)
    let rtt = 120;
    let isOwner = false;
    let pendingGoalAt = 0;
    let myTarget = null;
    let activePointer = null;
    let lastMoveSent = 0;
    let lastPuckSent = 0;
    let visualOffset = { x: 0, y: 0 };
    let lastDisplayed = null;
    let wasOwner = false;
    let drop = null;
    let frame = 0;
    let lastFrame = performance.now();

    const opponent = () => (role === 'p1' ? 'p2' : 'p1');

    const sendPuck = (now) => {
      lastPuckSent = now;
      const { x, y, vx, vy } = local.puck;
      socket.emit('airHockeyPuck', { roomId: roomCode, puck: { x, y, vx, vy } });
    };

    const sendMove = (now, force = false) => {
      if (!myTarget || (!force && now - lastMoveSent < SEND_MOVE_MS)) return;
      lastMoveSent = now;
      socket.volatile.emit('airHockeyMove', { roomId: roomCode, position: myTarget });
    };

    // Snapshot interpolation at (server time - INTERP_DELAY).
    const sampleAt = (renderServerTime) => {
      if (snapshots.length === 0) return null;
      let older = snapshots[0];
      let newer = null;
      for (let i = snapshots.length - 1; i >= 0; i--) {
        if (snapshots[i].t <= renderServerTime) {
          older = snapshots[i];
          newer = snapshots[i + 1] || null;
          break;
        }
      }
      if (!newer) {
        const ahead = Math.min(Math.max(renderServerTime - older.t, 0), 100) / 1000;
        return {
          puck: { x: older.puck.x + older.puck.vx * ahead, y: older.puck.y + older.puck.vy * ahead, vx: older.puck.vx, vy: older.puck.vy },
          strikers: older.strikers,
        };
      }
      const t = (renderServerTime - older.t) / Math.max(newer.t - older.t, 1);
      const mix = (a, b) => ({ x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) });
      return {
        puck: { ...mix(older.puck, newer.puck), vx: newer.puck.vx, vy: newer.puck.vy },
        strikers: { p1: mix(older.strikers.p1, newer.strikers.p1), p2: mix(older.strikers.p2, newer.strikers.p2) },
      };
    };

    const claimPuck = (snap, now, oppStriker) => {
      local.puck = { ...snap.puck };
      local.strikers[role] = { ...(myTarget || strikerHome(role)), vx: 0, vy: 0 };
      local.strikers[opponent()] = { ...oppStriker, vx: 0, vy: 0 };
      // Bring the puck forward to "now": snapshot age plus one-way latency.
      const ageMs = now - clockOffset - snap.t + rtt / 2;
      const ahead = Math.min(Math.max(ageMs, 0), 250) / 1000;
      if (ahead > 0) stepTable(local, {}, ahead, { goals: false });
      isOwner = true;
    };

    // ---- socket events ----
    const onRole = ({ role: r }) => {
      role = r;
      setMyRole(r);
      myTarget = strikerHome(r);
    };
    const onState = (st) => {
      status = st.status;
      if (status !== 'playing') {
        isOwner = false;
        pendingGoalAt = 0;
      }
      if (status === 'countdown') {
        trail.length = 0;
        if (role) {
          myTarget = strikerHome(role);
          sendMove(performance.now(), true);
        }
      }
      setUi({ score: st.score, status: st.status, winner: st.winner });
    };
    const onSnap = (raw) => {
      const now = performance.now();
      const snap = parseSnapshot(raw);
      const sample = now - snap.t;
      if (clockOffset === null || sample < clockOffset) clockOffset = sample;
      else clockOffset += (sample - clockOffset) * 0.002; // slowly adapt to drift
      snapshots.push(snap);
      while (snapshots.length > 2 && snapshots[0].t < snap.t - 1000) snapshots.shift();
    };
    const onCountdown = (n) => setCountdown(n > 0 ? n : null);
    const onGoal = (scorer) => {
      setGoalBy(scorer);
      if (lastDisplayed) drop = { x: lastDisplayed.x, y: lastDisplayed.y, start: performance.now() };
      isOwner = false;
      pendingGoalAt = 0;
      setTimeout(() => setGoalBy(null), 1100);
    };
    const onGameOver = (st) => setUi({ score: st.score, status: st.status, winner: st.winner });

    socket.on('airHockeyRole', onRole);
    socket.on('gameState', onState);
    socket.on('ah:snap', onSnap);
    socket.on('countdown', onCountdown);
    socket.on('goalAnimation', onGoal);
    socket.on('gameOver', onGameOver);

    const pingTimer = setInterval(() => {
      const sent = performance.now();
      socket.timeout(2000).emit('ah:ping', sent, (err) => {
        if (!err) rtt = rtt * 0.8 + (performance.now() - sent) * 0.2;
      });
    }, 2000);

    // ---- input ----
    const flip = () => role === 'p2';
    const onPointerDown = (e) => {
      if (!role || activePointer !== null) return;
      e.preventDefault();
      activePointer = e.pointerId;
      canvas.setPointerCapture?.(e.pointerId);
      myTarget = clampStriker(role, pointerToTable(e, canvas, flip()));
      sendMove(performance.now(), true);
    };
    const onPointerMove = (e) => {
      if (e.pointerId !== activePointer || !role) return;
      myTarget = clampStriker(role, pointerToTable(e, canvas, flip()));
      sendMove(performance.now());
    };
    const onPointerUp = (e) => {
      if (e.pointerId !== activePointer) return;
      activePointer = null;
      sendMove(performance.now(), true);
      if (canvas.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('resize', renderer.resize);

    // ---- frame loop ----
    const loop = (now) => {
      const dt = Math.min(0.05, (now - lastFrame) / 1000);
      lastFrame = now;
      frame = requestAnimationFrame(loop);
      if (!role || clockOffset === null) {
        renderer.draw({ puck: null, strikers: createTableState().strikers, flip: flip() });
        return;
      }

      const remote = sampleAt(now - clockOffset - INTERP_DELAY_MS);
      const latest = snapshots[snapshots.length - 1];
      const oppStriker = remote ? remote.strikers[opponent()] : strikerHome(opponent());
      const mine = myTarget || strikerHome(role);

      if (pendingGoalAt && now - pendingGoalAt > PENDING_GOAL_TIMEOUT_MS) pendingGoalAt = 0;

      // Take over the puck when the server says it is ours.
      if (!isOwner && !pendingGoalAt && status === 'playing' && latest?.authority === role && latest.status === 'playing') {
        claimPuck(latest, now, oppStriker);
      }

      let basePuck = remote ? remote.puck : null;
      if (isOwner) {
        const events = stepTable(local, { [role]: mine, [opponent()]: oppStriker }, dt, { goals: true });
        if (events.goal) {
          sendPuck(now);
          isOwner = false;
          pendingGoalAt = now;
        } else if (puckHalf(local.puck, role) !== role) {
          sendPuck(now); // hand the puck over to the other side
          isOwner = false;
        } else if (events.hit || now - lastPuckSent >= SEND_PUCK_MS) {
          sendPuck(now);
        }
        basePuck = local.puck;
      } else if (pendingGoalAt) {
        basePuck = local.puck;
      }

      // Smooth over the switch between local simulation and the snapshot buffer.
      if (wasOwner !== (isOwner || Boolean(pendingGoalAt)) && lastDisplayed && basePuck) {
        visualOffset = { x: lastDisplayed.x - basePuck.x, y: lastDisplayed.y - basePuck.y };
      }
      wasOwner = isOwner || Boolean(pendingGoalAt);
      const decay = Math.exp(-dt / 0.09);
      visualOffset = { x: visualOffset.x * decay, y: visualOffset.y * decay };

      const showPuck = status === 'playing' || status === 'countdown';
      const displayed = basePuck && showPuck ? { x: basePuck.x + visualOffset.x, y: basePuck.y + visualOffset.y } : null;
      if (displayed) lastDisplayed = displayed;

      const speed = basePuck ? Math.hypot(basePuck.vx, basePuck.vy) : 0;
      if (displayed && status === 'playing' && speed > 200) {
        trail.push(displayed);
        if (trail.length > 10) trail.shift();
      } else if (trail.length) {
        trail.shift();
      }

      let dropFrame = null;
      if (drop) {
        const progress = (now - drop.start) / GOAL_DROP_MS;
        if (progress < 1) dropFrame = { x: drop.x, y: drop.y, progress };
        else drop = null;
      }

      renderer.draw({
        puck: dropFrame ? null : displayed,
        strikers: { [role]: mine, [opponent()]: oppStriker },
        flip: flip(),
        trail,
        drop: dropFrame,
      });
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      clearInterval(pingTimer);
      socket.off('airHockeyRole', onRole);
      socket.off('gameState', onState);
      socket.off('ah:snap', onSnap);
      socket.off('countdown', onCountdown);
      socket.off('goalAnimation', onGoal);
      socket.off('gameOver', onGameOver);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('resize', renderer.resize);
    };
  }, [active, roomCode, canvasRef]);

  return { ui, countdown, goalBy, myRole, setUi };
}

export { TABLE };
