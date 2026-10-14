import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  TABLE,
  createTableState,
  resetAfterGoal,
  clampStriker,
  stepTable,
} from '@engines/airHockeyPhysics.js';
import { createRenderer, pointerToTable, P1_COLOR, P2_COLOR } from './renderer.js';
import { createAirHockeyBot } from './bot.js';

const { WIDTH, HEIGHT, MAX_SCORE } = TABLE;
const KEY_SPEED = 750; // px/s for keyboard control
const GOAL_DROP_MS = 450;

const KEYMAP = {
  p1: { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] },
  p2: { a: [-1, 0], d: [1, 0], w: [0, -1], s: [0, 1] },
};

/**
 * Air hockey without a network: two players sharing one screen (mode "local")
 * or one player against the computer (mode "bot"). Same physics as online play.
 */
export default function AirHockeyLocal({ mode, difficulty = 'medium', names, exitPath }) {
  const canvasRef = useRef(null);
  const [score, setScore] = useState({ p1: 0, p2: 0 });
  const [countdown, setCountdown] = useState(3);
  const [goalBy, setGoalBy] = useState(null);
  const [winner, setWinner] = useState(null);
  const [round, setRound] = useState(0);

  const isBot = mode === 'bot';
  const p1Name = names[0] || 'Player 1';
  const p2Name = isBot ? `Bot (${difficulty})` : names[1] || 'Player 2';

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderer = createRenderer(canvas);
    const state = createTableState();
    const bot = isBot ? createAirHockeyBot(difficulty) : null;
    const targets = { p1: { ...state.strikers.p1 }, p2: { ...state.strikers.p2 } };
    const pointers = new Map(); // pointerId -> role
    const keys = new Set();
    const trail = [];
    const localScore = { p1: 0, p2: 0 };
    let status = 'countdown';
    let drop = null;
    let frame = 0;
    let last = performance.now();
    const timers = [];

    const startCountdown = () => {
      status = 'countdown';
      let n = 3;
      setCountdown(n);
      const tick = () => {
        n -= 1;
        if (n <= 0) {
          setCountdown(null);
          status = 'playing';
        } else {
          setCountdown(n);
          timers.push(setTimeout(tick, 700));
        }
      };
      timers.push(setTimeout(tick, 700));
    };

    const resetPositions = (conceder) => {
      resetAfterGoal(state, conceder);
      targets.p1 = { ...state.strikers.p1 };
      targets.p2 = { ...state.strikers.p2 };
      bot?.reset();
      trail.length = 0;
    };

    const roleForPointer = (point) => (isBot ? 'p1' : point.y >= HEIGHT / 2 ? 'p1' : 'p2');

    const onPointerDown = (e) => {
      e.preventDefault();
      const point = pointerToTable(e, canvas);
      const role = roleForPointer(point);
      if ([...pointers.values()].includes(role)) return; // one finger per striker
      pointers.set(e.pointerId, role);
      canvas.setPointerCapture?.(e.pointerId);
      targets[role] = clampStriker(role, point);
    };
    const onPointerMove = (e) => {
      const role = pointers.get(e.pointerId);
      if (!role) return;
      targets[role] = clampStriker(role, pointerToTable(e, canvas));
    };
    const onPointerUp = (e) => {
      pointers.delete(e.pointerId);
      if (canvas.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    };
    const onKeyDown = (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (KEYMAP.p1[key] || (!isBot && KEYMAP.p2[key])) {
        e.preventDefault();
        keys.add(key);
      }
    };
    const onKeyUp = (e) => keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointercancel', onPointerUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('resize', renderer.resize);

    const applyKeys = (role, dt) => {
      let dx = 0;
      let dy = 0;
      for (const key of keys) {
        const dir = KEYMAP[role][key];
        if (dir) {
          dx += dir[0];
          dy += dir[1];
        }
      }
      if (dx || dy) {
        targets[role] = clampStriker(role, {
          x: targets[role].x + dx * KEY_SPEED * dt,
          y: targets[role].y + dy * KEY_SPEED * dt,
        });
      }
    };

    const loop = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      applyKeys('p1', dt);
      if (bot) targets.p2 = bot.update(state, dt);
      else applyKeys('p2', dt);

      if (status === 'playing') {
        const events = stepTable(state, targets, dt);
        if (events.goal) {
          const scorer = events.goal;
          const conceder = scorer === 'p1' ? 'p2' : 'p1';
          localScore[scorer] += 1;
          setScore({ ...localScore });
          drop = { x: state.puck.x, y: state.puck.y, start: now };
          if (localScore[scorer] >= MAX_SCORE) {
            status = 'finished';
            setWinner(scorer);
          } else {
            status = 'goal';
            setGoalBy(scorer);
            timers.push(
              setTimeout(() => {
                setGoalBy(null);
                resetPositions(conceder);
                startCountdown();
              }, 1100),
            );
          }
        }
      } else {
        // Strikers stay responsive during countdowns; the puck waits.
        stepTable(state, targets, dt, { simulatePuck: false });
      }

      const speed = Math.hypot(state.puck.vx, state.puck.vy);
      if (status === 'playing' && speed > 200) {
        trail.push({ x: state.puck.x, y: state.puck.y });
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
        puck: status === 'goal' || status === 'finished' ? null : state.puck,
        strikers: state.strikers,
        trail,
        drop: dropFrame,
      });
      frame = requestAnimationFrame(loop);
    };

    resetPositions(null);
    startCountdown();
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(clearTimeout);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', renderer.resize);
    };
  }, [isBot, difficulty, round]);

  const playAgain = () => {
    setScore({ p1: 0, p2: 0 });
    setWinner(null);
    setGoalBy(null);
    setRound((r) => r + 1);
  };

  const scorePill = (role, name, rotate) => (
    <div
      className={`flex items-center justify-between gap-3 w-full px-4 py-2 bg-white border-[3px] border-black shadow-[4px_4px_0px_#000] font-black uppercase ${rotate ? 'rotate-180' : ''}`}
    >
      <span className="truncate" style={{ color: role === 'p1' ? P1_COLOR : P2_COLOR }}>
        {name}
      </span>
      <span className="text-2xl text-black">{score[role]}</span>
    </div>
  );

  return (
    <div className="w-full max-w-[520px] mx-auto px-3 py-6 font-sans">
      <style>{`
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.8) rotate(-5deg); } 100% { opacity: 1; transform: scale(1) rotate(-2deg); } }
        .animate-pop-in { animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>

      <div className="mb-3">{scorePill('p2', p2Name, !isBot)}</div>

      <div className="relative border-[4px] border-black bg-white p-2 shadow-[8px_8px_0px_#000] rounded-xl">
        {countdown && !winner && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10 rounded-xl pointer-events-none">
            <span className="text-[6rem] font-black text-black animate-pop-in">{countdown}</span>
          </div>
        )}
        {goalBy && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/60 z-10 rounded-xl pointer-events-none">
            <span
              className={`text-5xl font-black uppercase tracking-widest bg-[#facc15] border-[3px] border-black shadow-[4px_4px_0px_#000] px-6 py-2 animate-pop-in ${goalBy === 'p2' && !isBot ? 'rotate-180' : ''}`}
              style={{ color: goalBy === 'p1' ? P1_COLOR : P2_COLOR }}
            >
              Goal!
            </span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={WIDTH}
          height={HEIGHT}
          className="block w-full h-auto rounded touch-none select-none aspect-[2/3] max-h-[78vh] mx-auto cursor-grab active:cursor-grabbing"
        />
      </div>

      <div className="mt-3">{scorePill('p1', p1Name, false)}</div>

      <p className="mt-4 text-center font-body text-sm font-semibold text-gray-600">
        {isBot
          ? 'Drag your blue striker in the bottom half. Arrow keys work too. First to 5 wins.'
          : 'Each player uses their own half. On a keyboard: blue uses the arrow keys, red uses W A S D. First to 5 wins.'}
      </p>

      {winner && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white border-[4px] border-black shadow-[12px_12px_0px_#000] p-10 text-center animate-pop-in rounded-xl">
            <div className="text-sm font-bold tracking-widest uppercase text-gray-500 mb-2">Match Concluded</div>
            <h2
              className="text-[clamp(2rem,6vw,3.25rem)] font-black mb-2 tracking-tight uppercase"
              style={{ WebkitTextStroke: '2px black', color: winner === 'p1' ? P1_COLOR : P2_COLOR }}
            >
              {winner === 'p1' ? p1Name : p2Name}
            </h2>
            <h3 className="text-2xl font-bold mb-2 uppercase">wins!</h3>
            <p className="font-black text-xl mb-8">
              {score.p1} - {score.p2}
            </p>
            <div className="flex flex-col gap-3">
              <button
                type="button"
                onClick={playAgain}
                className="bg-[#facc15] w-full py-4 text-sm font-black tracking-widest uppercase border-[3px] border-black shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all rounded"
              >
                Play Again
              </button>
              <Link
                to={exitPath}
                className="bg-gray-200 w-full block py-4 text-sm font-bold tracking-widest uppercase border-[3px] border-black shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] text-black text-center transition-all rounded"
              >
                Exit
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
