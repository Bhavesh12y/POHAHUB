import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import ArcadeShell, { GameOverOverlay, StartOverlay, useArcadeScores } from '../three/ArcadeShell.jsx';
import { createTrafficState, setLane, startTraffic } from './trafficLogic.js';

const TrafficScene = lazy(() => import('./TrafficScene.jsx'));
const SWIPE_MIN = 25;

export default function TrafficRun() {
  const gameRef = useRef(createTrafficState());
  const onEvents = useRef(null);
  const pointerRef = useRef(null);
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [status, setStatus] = useState('ready');
  const { highScore, leaderboard } = useArcadeScores('traffic-run', 'trafficrun-highScore', score, status === 'over');

  onEvents.current = (events, game) => {
    if (events.scored) setScore(game.score);
    if (events.levelUp) setLevel(game.level);
    if (events.crashed) setStatus('over');
  };

  const start = useCallback(() => {
    startTraffic(gameRef.current);
    setScore(0);
    setLevel(1);
    setStatus('playing');
  }, []);

  const shift = useCallback((delta) => {
    const game = gameRef.current;
    setLane(game, game.lane + delta);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(key)) e.preventDefault();
      const game = gameRef.current;
      if (!game.isPlaying) {
        if ((key === ' ' || key === 'Enter') && !game.isGameOver) start();
        return;
      }
      if (key === 'ArrowLeft' || key === 'a') shift(-1);
      if (key === 'ArrowRight' || key === 'd') shift(1);
    };
    window.addEventListener('keydown', onKey, { passive: false });
    return () => window.removeEventListener('keydown', onKey);
  }, [shift, start]);

  const stageProps = {
    onPointerDown: (e) => {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      pointerRef.current = { x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e) => {
      const startPos = pointerRef.current;
      pointerRef.current = null;
      if (!startPos) return;
      const game = gameRef.current;
      if (!game.isPlaying) {
        if (!game.isGameOver) start();
        return;
      }
      const dx = e.clientX - startPos.x;
      if (Math.abs(dx) > SWIPE_MIN) {
        shift(dx > 0 ? 1 : -1);
      } else if (Math.hypot(dx, e.clientY - startPos.y) < 15) {
        // Tap a lane to jump straight to it.
        const rect = e.currentTarget.getBoundingClientRect();
        setLane(game, Math.floor(((e.clientX - rect.left) / rect.width) * 3));
      }
    },
    className: 'cursor-pointer',
  };

  const laneButtons = (
    <div className="grid grid-cols-2 gap-3">
      {[
        ['Left', -1],
        ['Right', 1],
      ].map(([label, delta]) => (
        <button
          key={label}
          type="button"
          onPointerDown={(e) => {
            e.preventDefault();
            shift(delta);
          }}
          className="bg-[#a9def9] border-[4px] border-black shadow-[5px_5px_0_0_#000] active:shadow-none active:translate-x-1 active:translate-y-1 transition-all font-black py-3 text-xl uppercase touch-manipulation"
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <ArcadeShell
      title="Traffic Run"
      score={score}
      highScore={highScore}
      leaderboard={leaderboard}
      stageClass="stage-portrait"
      stageProps={stageProps}
      controls={laneButtons}
      hint="Swipe left or right, tap a lane, or use the arrow keys / A and D. Speed rises every 8 seconds."
      overlay={
        <>
          {status === 'ready' && <StartOverlay text="Tap to Start Engine!" />}
          {status === 'over' && <GameOverOverlay title="Crashed!" score={score} onRetry={start} />}
        </>
      }
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#bae6fd] to-[#e0f2fe]" />
      <div className="absolute top-3 left-3 z-10 bg-white border-[3px] border-black px-3 py-1 font-black uppercase text-sm shadow-[3px_3px_0_0_#000] pointer-events-none">
        Level {level}
      </div>
      <Suspense fallback={<div className="relative h-full flex items-center justify-center font-black uppercase animate-pulse">Loading 3D...</div>}>
        <TrafficScene gameRef={gameRef} onEvents={onEvents} />
      </Suspense>
    </ArcadeShell>
  );
}
