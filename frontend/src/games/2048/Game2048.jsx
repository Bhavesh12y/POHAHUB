import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import ArcadeShell, { GameOverOverlay, useArcadeScores } from '../three/ArcadeShell.jsx';
import { move, newGame } from './logic2048.js';

const Scene2048 = lazy(() => import('./Scene2048.jsx'));
const SWIPE_MIN = 24;
const KEYS = {
  ArrowLeft: 'left', a: 'left', ArrowRight: 'right', d: 'right',
  ArrowUp: 'up', w: 'up', ArrowDown: 'down', s: 'down',
};

export default function Game2048() {
  const [game, setGame] = useState(() => newGame());
  const [ghosts, setGhosts] = useState([]);
  const gameRef = useRef(game);
  const swipeRef = useRef(null);
  const ghostTimer = useRef(null);
  const { highScore, leaderboard } = useArcadeScores('2048', '2048-highScore', game.score, game.over);

  const apply = useCallback((dir) => {
    const current = gameRef.current;
    if (current.over) return;
    const next = move(current, dir);
    if (!next) return;
    gameRef.current = next;
    setGame(next);
    setGhosts(next.ghosts);
    clearTimeout(ghostTimer.current);
    ghostTimer.current = setTimeout(() => setGhosts([]), 160);
  }, []);

  const restart = () => {
    const fresh = newGame();
    gameRef.current = fresh;
    setGame(fresh);
    setGhosts([]);
  };

  useEffect(() => {
    const onKey = (e) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const dir = KEYS[key];
      if (!dir) return;
      e.preventDefault();
      apply(dir);
    };
    window.addEventListener('keydown', onKey, { passive: false });
    return () => {
      window.removeEventListener('keydown', onKey);
      clearTimeout(ghostTimer.current);
    };
  }, [apply]);

  const stageProps = {
    onPointerDown: (e) => {
      e.currentTarget.setPointerCapture?.(e.pointerId);
      swipeRef.current = { x: e.clientX, y: e.clientY };
    },
    onPointerUp: (e) => {
      const start = swipeRef.current;
      swipeRef.current = null;
      if (!start) return;
      const dx = e.clientX - start.x;
      const dy = e.clientY - start.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN) return;
      if (Math.abs(dx) > Math.abs(dy)) apply(dx > 0 ? 'right' : 'left');
      else apply(dy > 0 ? 'down' : 'up');
    },
    className: 'cursor-grab active:cursor-grabbing',
  };

  return (
    <ArcadeShell
      title="2048"
      score={game.score}
      highScore={highScore}
      leaderboard={leaderboard}
      stageClass="stage-square"
      stageProps={stageProps}
      hint="Swipe on the board, or use the arrow keys / W A S D. Merge matching tiles to reach 2048."
      controls={
        <button
          type="button"
          onClick={restart}
          className="w-full bg-[#fcd34d] border-[3px] border-black shadow-[4px_4px_0_0_#000] hover:-translate-y-0.5 active:translate-x-1 active:translate-y-1 active:shadow-none transition-all font-black py-3 uppercase tracking-widest"
        >
          New Game
        </button>
      }
      overlay={game.over && <GameOverOverlay title="No moves left!" score={game.score} onRetry={restart} />}
    >
      <Suspense fallback={<div className="h-full flex items-center justify-center font-black uppercase animate-pulse">Loading 3D...</div>}>
        <Scene2048 tiles={game.tiles} ghosts={ghosts} />
      </Suspense>
    </ArcadeShell>
  );
}
