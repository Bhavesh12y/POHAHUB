import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import ArcadeShell, { GameOverOverlay, StartOverlay, useArcadeScores } from '../three/ArcadeShell.jsx';
import { createHelixState, supportsWebGL } from './helixLogic.js';

const HelixScene = lazy(() => import('./HelixScene.jsx'));
const HelixJump2D = lazy(() => import('./HelixJump2D.jsx'));

export default function HelixJump() {
  const [webgl, setWebgl] = useState(null);
  useEffect(() => setWebgl(supportsWebGL()), []);

  if (webgl === false) {
    return (
      <Suspense fallback={null}>
        <HelixJump2D />
      </Suspense>
    );
  }
  return <HelixJump3D />;
}

function HelixJump3D() {
  const stageRef = useRef(null);
  const gameRef = useRef(createHelixState());
  const dragRef = useRef({ isDragging: false, lastX: 0 });
  const popupId = useRef(0);

  const [resetKey, setResetKey] = useState(0);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [popups, setPopups] = useState([]);
  const { highScore, leaderboard } = useArcadeScores('helix-jump', 'helixjump-highScore', score, gameOver);

  const triggerPopup = useCallback((text, type) => {
    const id = popupId.current++;
    setPopups((prev) => [...prev, { id, text, type }]);
    setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== id)), 1000);
  }, []);

  // Called every frame from the 3D scene; only touches React state on real events.
  const handleEvents = useCallback(
    (events, game) => {
      if (events.passed.length || events.smash) setScore(game.score);
      events.passed.forEach((combo) => {
        if (combo > 1) triggerPopup(`${combo}x DROP!`, 'praise');
      });
      if (events.smash) {
        triggerPopup('SMASH!', 'combo');
        setIsShaking(true);
        setTimeout(() => setIsShaking(false), 200);
      }
      if (events.gameOver) setGameOver(true);
    },
    [triggerPopup],
  );

  const resetGame = () => {
    gameRef.current = createHelixState();
    dragRef.current = { isDragging: false, lastX: 0 };
    setScore(0);
    setGameOver(false);
    setGameStarted(false);
    setResetKey((k) => k + 1);
  };

  const onPointerDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const game = gameRef.current;
    if (game.isGameOver) return;
    if (!game.hasStarted) {
      game.hasStarted = true;
      setGameStarted(true);
    }
    dragRef.current.isDragging = true;
    dragRef.current.lastX = e.clientX;
  };

  useEffect(() => {
    const onMove = (e) => {
      const drag = dragRef.current;
      const game = gameRef.current;
      if (!drag.isDragging || game.isGameOver) return;
      const width = stageRef.current?.getBoundingClientRect().width || 360;
      const delta = (e.clientX - drag.lastX) * (4.6 / width);
      game.towerAngle += delta;
      game.spinVelocity = delta;
      drag.lastX = e.clientX;
    };
    const onUp = () => {
      dragRef.current.isDragging = false;
    };
    // Keyboard: hold left/right to spin.
    const keys = new Set();
    let raf = 0;
    const spin = () => {
      const game = gameRef.current;
      const dir = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
      if (dir && !game.isGameOver) {
        game.towerAngle += dir * 0.07;
        game.spinVelocity = dir * 0.07;
      }
      raf = keys.size ? requestAnimationFrame(spin) : 0;
    };
    const onKeyDown = (e) => {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
      e.preventDefault();
      const game = gameRef.current;
      if (!game.hasStarted && !game.isGameOver) {
        game.hasStarted = true;
        setGameStarted(true);
      }
      keys.add(e.key);
      if (!raf) raf = requestAnimationFrame(spin);
    };
    const onKeyUp = (e) => keys.delete(e.key);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  return (
    <>
      <style>{`
        @keyframes helixFloat { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-40px) scale(1.2); opacity: 0; } }
        @keyframes boardShake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px) rotate(-2deg); } 75% { transform: translateX(6px) rotate(2deg); } }
        .animate-helix-float { animation: helixFloat 1s ease-out forwards; }
        .animate-shake { animation: boardShake 0.2s ease-in-out; }
      `}</style>
      <div className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center">
        {popups.map((popup) => (
          <div key={popup.id} className="absolute animate-helix-float mt-32">
            <span className={`font-black uppercase text-4xl drop-shadow-[3px_3px_0_#000] ${popup.type === 'combo' ? 'text-[#ef476f]' : 'text-[#06d6a0]'}`}>
              {popup.text}
            </span>
          </div>
        ))}
      </div>

      <ArcadeShell
        title="Helix Drop"
        score={score}
        highScore={highScore}
        leaderboard={leaderboard}
        stageClass="stage-portrait"
        stageRef={stageRef}
        stageProps={{ onPointerDown, className: `cursor-grab active:cursor-grabbing ${isShaking ? 'animate-shake' : ''}` }}
        hint="Drag left and right (or hold the arrow keys) to spin the tower. Drop through gaps, avoid red, and fall three floors in a row to smash the next one."
        overlay={
          <>
            {!gameStarted && !gameOver && <StartOverlay text="Drag to Spin!" />}
            {gameOver && <GameOverOverlay title="Smashed!" score={score} onRetry={resetGame} />}
          </>
        }
      >
        <Suspense fallback={<div className="h-full flex items-center justify-center font-black uppercase animate-pulse">Loading 3D...</div>}>
          <HelixScene gameRef={gameRef} dragRef={dragRef} onEvents={handleEvents} resetKey={resetKey} />
        </Suspense>
      </ArcadeShell>
    </>
  );
}
