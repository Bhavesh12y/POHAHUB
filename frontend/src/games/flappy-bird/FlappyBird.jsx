import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import ArcadeShell, { GameOverOverlay, StartOverlay, useArcadeScores } from '../three/ArcadeShell.jsx';
import { createFlappyState, flap, JUMP_STRENGTH } from './flappyLogic.js';

const FlappyScene = lazy(() => import('./FlappyScene.jsx'));

export default function FlappyBird() {
  const gameRef = useRef(createFlappyState());
  const onEvents = useRef(null);
  const countdownTimer = useRef(null);
  const [score, setScore] = useState(0);
  const [status, setStatus] = useState('ready'); // ready | countdown | playing | over
  const [countdown, setCountdown] = useState(null);
  const { highScore, leaderboard } = useArcadeScores('flappy-bird', 'flappybird-highScore', score, status === 'over');

  onEvents.current = (events, game) => {
    if (events.scored) setScore(game.score);
    if (events.crashed) setStatus('over');
  };

  const begin = useCallback(() => {
    if (countdownTimer.current) return;
    setStatus('countdown');
    let n = 3;
    setCountdown(n);
    countdownTimer.current = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(countdownTimer.current);
        countdownTimer.current = null;
        setCountdown(null);
        gameRef.current.hasStarted = true;
        gameRef.current.birdV = JUMP_STRENGTH;
        setStatus('playing');
      } else {
        setCountdown(n);
      }
    }, 800);
  }, []);

  const tap = useCallback(() => {
    const game = gameRef.current;
    if (game.isGameOver) return;
    if (!game.hasStarted) begin();
    else flap(game);
  }, [begin]);

  const restart = () => {
    clearInterval(countdownTimer.current);
    countdownTimer.current = null;
    gameRef.current = createFlappyState();
    setScore(0);
    setCountdown(null);
    setStatus('ready');
  };

  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        if (gameRef.current.isGameOver) restart();
        else tap();
      }
    };
    window.addEventListener('keydown', onKey, { passive: false });
    return () => {
      window.removeEventListener('keydown', onKey);
      clearInterval(countdownTimer.current);
    };
  }, [tap]);

  return (
    <ArcadeShell
      title="Flappy Bird"
      score={score}
      highScore={highScore}
      leaderboard={leaderboard}
      stageClass="stage-portrait"
      stageProps={{ onPointerDown: tap, className: 'cursor-pointer' }}
      hint="Tap the screen or press Space to flap. Fly through the gaps; pipes get closer as your score climbs."
      overlay={
        <>
          {status === 'ready' && <StartOverlay text="Tap or Space to Start!" />}
          {countdown && (
            <div className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none">
              <span className="text-[7rem] font-black text-black drop-shadow-[4px_4px_0_#fff]">{countdown}</span>
            </div>
          )}
          {status === 'over' && <GameOverOverlay title="Ouch!" score={score} onRetry={restart} />}
        </>
      }
    >
      <div className="absolute inset-0 bg-gradient-to-b from-[#bae6fd] via-[#e0f2fe] to-[#fef08a]" />
      <div className="absolute top-3 inset-x-0 z-10 text-center pointer-events-none">
        <span className="text-5xl font-black text-white drop-shadow-[3px_3px_0_#000]">{score}</span>
      </div>
      <Suspense fallback={<div className="relative h-full flex items-center justify-center font-black uppercase animate-pulse">Loading 3D...</div>}>
        <FlappyScene gameRef={gameRef} onEvents={onEvents} />
      </Suspense>
    </ArcadeShell>
  );
}
