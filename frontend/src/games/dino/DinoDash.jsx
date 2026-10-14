import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import ArcadeShell, { GameOverOverlay, StartOverlay, useArcadeScores } from '../three/ArcadeShell.jsx';
import { createDinoState, jumpDino, startDino } from './dinoLogic.js';

const DinoScene = lazy(() => import('./DinoScene.jsx'));

export default function DinoDash() {
  const gameRef = useRef(createDinoState());
  const onEvents = useRef(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('ready'); // ready | playing | over
  const { highScore, leaderboard } = useArcadeScores('dino', 'dinodash-highScore', score, status === 'over');

  onEvents.current = (events, game) => {
    const s = Math.floor(game.score);
    if (s !== score) setScore(s);
    if (events.crashed) setStatus('over');
  };

  const jump = useCallback(() => {
    const game = gameRef.current;
    if (!game.isPlaying) {
      if (game.isGameOver) return; // use the Try Again button
      startDino(game);
      setScore(0);
      setStatus('playing');
      return;
    }
    jumpDino(game);
  }, []);

  const restart = () => {
    startDino(gameRef.current);
    setScore(0);
    setStatus('playing');
  };

  useEffect(() => {
    const onKey = (e) => {
      if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
        e.preventDefault();
        if (gameRef.current.isGameOver) restart();
        else jump();
      }
    };
    window.addEventListener('keydown', onKey, { passive: false });
    return () => window.removeEventListener('keydown', onKey);
  }, [jump]);

  const jumpButton = (
    <button
      type="button"
      onPointerDown={(e) => {
        e.preventDefault();
        if (gameRef.current.isGameOver) restart();
        else jump();
      }}
      className="w-full bg-[#ff99c8] border-[4px] border-black shadow-[6px_6px_0_0_#000] active:shadow-none active:translate-x-1.5 active:translate-y-1.5 transition-all font-black py-4 text-3xl uppercase tracking-widest touch-manipulation"
    >
      Jump
    </button>
  );

  return (
    <ArcadeShell
      title="Dino Dash"
      score={score}
      highScore={highScore}
      leaderboard={leaderboard}
      stageClass="stage-landscape"
      stageProps={{ onPointerDown: jump, className: 'cursor-pointer' }}
      controls={jumpButton}
      hint="Tap the screen or press Space, W or the Up arrow to jump. It gets faster the longer you survive."
      overlay={
        <>
          {status === 'ready' && <StartOverlay text="Tap to Start!" />}
          {status === 'over' && <GameOverOverlay title="Crashed!" score={score} onRetry={restart} />}
        </>
      }
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#fef08a] via-[#fed7aa] to-[#fbcfe8]" />
      <Suspense fallback={<div className="relative h-full flex items-center justify-center font-black uppercase animate-pulse">Loading 3D...</div>}>
        <DinoScene gameRef={gameRef} onEvents={onEvents} />
      </Suspense>
    </ArcadeShell>
  );
}
