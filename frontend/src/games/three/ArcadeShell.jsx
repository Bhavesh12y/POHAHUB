import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';
import { getPlayerName } from '../../lib/playerName.js';

function readNumber(key) {
  try {
    return parseInt(localStorage.getItem(key) || '0', 10) || 0;
  } catch {
    return 0;
  }
}

/**
 * Personal best (this device) + global top three for a solo game. Submits the
 * score once per finished run.
 */
export function useArcadeScores(gameId, highScoreKey, score, isGameOver) {
  const [highScore, setHighScore] = useState(() => readNumber(highScoreKey));
  const [leaderboard, setLeaderboard] = useState([]);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      try {
        localStorage.setItem(highScoreKey, String(score));
      } catch {
        // storage blocked: keep the in-memory best
      }
    }
  }, [score, highScore, highScoreKey]);

  useEffect(() => {
    const socket = connectSocket();
    const fetchBoard = () =>
      emitWithAck('leaderboard:get', gameId).then((res) => {
        if (res?.ok) setLeaderboard(res.leaderboard);
      });
    const onUpdate = (board) => setLeaderboard(board);
    if (socket.connected) fetchBoard();
    else socket.on('connect', fetchBoard);
    socket.on(`leaderboard:update:${gameId}`, onUpdate);
    return () => {
      socket.off(`leaderboard:update:${gameId}`, onUpdate);
      socket.off('connect', fetchBoard);
    };
  }, [gameId]);

  useEffect(() => {
    if (!isGameOver) {
      setSubmitted(false);
      return;
    }
    if (!submitted && score > 0) {
      setSubmitted(true);
      emitWithAck('leaderboard:submit', { gameId, name: getPlayerName() || 'Player', score });
    }
  }, [isGameOver, submitted, score, gameId]);

  return { highScore, leaderboard };
}

function ScoreCard({ label, value, color }) {
  return (
    <div className={`${color} border-[3px] border-black shadow-[3px_3px_0_0_#000] px-3 py-1.5 text-center min-w-[78px]`}>
      <div className="text-[10px] sm:text-xs uppercase font-black tracking-wider">{label}</div>
      <div className="text-xl sm:text-2xl font-black leading-tight">{value}</div>
    </div>
  );
}

export function Leaderboard({ entries }) {
  const rankColors = ['bg-[#ffd166]', 'bg-[#d0f4de]', 'bg-[#ffb5a7]'];
  return (
    <div className="bg-white border-[4px] border-black shadow-[6px_6px_0_0_#000] p-4 sm:p-5 w-full -rotate-[0.5deg]">
      <h2 className="text-xl font-black uppercase mb-3">Global Top 3</h2>
      {entries.length === 0 ? (
        <div className="bg-gray-100 border-[3px] border-dashed border-gray-400 p-3 text-center">
          <p className="font-bold text-gray-500 uppercase tracking-widest text-sm">No scores yet. Take the crown!</p>
        </div>
      ) : (
        <ol className="flex flex-col gap-2.5">
          {entries.map((entry, idx) => (
            <li
              key={entry.id || idx}
              className={`${rankColors[idx] || 'bg-white'} border-[3px] border-black p-2.5 shadow-[3px_3px_0_0_#000] flex justify-between items-center gap-3`}
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="text-base font-black bg-white border-[2px] border-black rounded-full w-8 h-8 shrink-0 flex items-center justify-center">
                  #{idx + 1}
                </span>
                <span className="font-black uppercase tracking-wider truncate">{entry.name}</span>
              </span>
              <span className="font-black text-xl">{entry.score}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export function StartOverlay({ text }) {
  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center pb-[12%] pointer-events-none">
      <div className="bg-[#fcf6bd] border-[3px] border-black shadow-[4px_4px_0_0_#000] px-5 py-3 text-center animate-bounce">
        <p className="font-black text-lg sm:text-xl uppercase">{text}</p>
      </div>
    </div>
  );
}

export function GameOverOverlay({ title, score, onRetry, retryLabel = 'Try Again' }) {
  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/60 backdrop-blur-[2px]">
      <div className="bg-[#ef476f] border-[4px] border-black shadow-[6px_6px_0_0_#000] p-5 sm:p-6 text-center -rotate-2">
        <h2 className="text-3xl sm:text-4xl font-black text-white uppercase">{title}</h2>
        <p className="font-black text-white uppercase mb-4">Score {score}</p>
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onRetry();
          }}
          className="bg-[#06d6a0] border-[3px] border-black shadow-[4px_4px_0_0_#000] active:shadow-none active:translate-x-1 active:translate-y-1 text-black font-black py-2 px-6 text-lg uppercase transition-all"
        >
          {retryLabel}
        </button>
      </div>
    </div>
  );
}

/**
 * Page layout shared by every solo arcade game.
 * Desktop: big stage on the left, scores + controls + leaderboard on the right.
 * Mobile: scores, stage, controls and leaderboard stacked.
 */
export default function ArcadeShell({
  title,
  score,
  highScore,
  leaderboard,
  stageClass = 'stage-portrait',
  stageProps = {},
  stageRef,
  overlay,
  controls,
  hint,
  children,
}) {
  const navigate = useNavigate();
  return (
    <div className="w-full mx-auto px-3 sm:px-6 py-4 sm:py-6 max-w-[calc(1280px/var(--app-zoom))] select-none">
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-8 items-center lg:items-start">
        <div className="w-full lg:flex-1 flex flex-col items-center min-w-0">
          <div className="flex w-full items-center justify-between gap-3 mb-3 lg:hidden">
            <h1 className="text-3xl font-black uppercase leading-none tracking-tight">{title}</h1>
            <div className="flex gap-2">
              <ScoreCard label="Score" value={score} color="bg-[#ff99c8]" />
              <ScoreCard label="Best" value={highScore} color="bg-[#ffd166]" />
            </div>
          </div>

          <div
            ref={stageRef}
            {...stageProps}
            className={`${stageClass} relative bg-white border-[4px] border-black shadow-[8px_8px_0_0_#000] overflow-hidden touch-none ${stageProps.className || ''}`}
          >
            <div
              className="absolute inset-0 opacity-50 pointer-events-none"
              style={{
                backgroundImage: 'linear-gradient(#e5e7eb 1px, transparent 1px), linear-gradient(90deg, #e5e7eb 1px, transparent 1px)',
                backgroundSize: '22px 22px',
              }}
            />
            <div className="absolute inset-0">{children}</div>
            {overlay}
          </div>

          {controls && <div className="w-full mt-4 lg:hidden">{controls}</div>}
        </div>

        <aside className="w-full lg:w-[320px] shrink-0 flex flex-col gap-5">
          <div className="hidden lg:block">
            <h1 className="text-5xl font-black uppercase leading-[0.9] tracking-tight mb-4">{title}</h1>
            <div className="flex gap-3">
              <ScoreCard label="Score" value={score} color="bg-[#ff99c8]" />
              <ScoreCard label="High Score" value={highScore} color="bg-[#ffd166]" />
            </div>
          </div>
          {controls && <div className="hidden lg:block">{controls}</div>}
          {hint && <p className="font-body text-sm font-semibold text-gray-600">{hint}</p>}
          <button
            type="button"
            onClick={() => navigate('/?mode=solo')}
            className="bg-[#48cae4] border-[3px] border-black shadow-[4px_4px_0_0_#000] hover:-translate-y-0.5 hover:shadow-[6px_6px_0_0_#000] active:translate-x-1 active:translate-y-1 active:shadow-none transition-all font-black py-2 uppercase"
          >
            &larr; Back to Arcade
          </button>
          <Leaderboard entries={leaderboard} />
        </aside>
      </div>
    </div>
  );
}
