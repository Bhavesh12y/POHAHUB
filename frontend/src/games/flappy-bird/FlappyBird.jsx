import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';

// --- GAME CONSTANTS ---
const CANVAS_WIDTH = 400; 
const CANVAS_HEIGHT = 600; 

const GRAVITY = 0.15; 
const JUMP_STRENGTH = -4.5; 

const PIPE_SPEED = 2.5;
const PIPE_WIDTH = 60;
const PIPE_GAP = 160; 
const BIRD_SIZE = 34;
const BIRD_X = 60; 
const PIPE_SPAWN_RATE = 110; 

// --- DYNAMIC DIFFICULTY HELPER ---
const getDifficultyParams = (score) => {
  return {
    gap: Math.max(100, PIPE_GAP - (score * 2)),         // Gap shrinks as score increases
    speed: PIPE_SPEED + (score * 0.05),                 // Speed slightly increases
    spawnRate: Math.max(70, PIPE_SPAWN_RATE - score)    // Pipes spawn slightly faster
  };
};

export default function FlappyBird() {
  const navigate = useNavigate();

  // -- High Performance Game State (Refs) --
  const frameRef = useRef(null);
  const lastTimeRef = useRef(0); // For Delta Time
  const framesCount = useRef(0);
  const physicsRef = useRef({
    birdY: CANVAS_HEIGHT / 2,
    birdV: 0,
    pipes: [],
    score: 0,
    isGameOver: false,
    hasStarted: false,
  });

  // -- React Render State --
  const [gameState, setGameState] = useState({
    birdY: CANVAS_HEIGHT / 2,
    birdV: 0,
    pipes: [],
  });
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  
  const [countdown, setCountdown] = useState(null);
  const countdownIntervalRef = useRef(null);
  
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [hasSubmittedScore, setHasSubmittedScore] = useState(false);
  
  const playerName = localStorage.getItem('Doozles-player-name') || 'Player';
  const [localHighScore, setLocalHighScore] = useState(() => {
    const saved = localStorage.getItem('flappybird-highScore');
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    if (score > localHighScore) {
      setLocalHighScore(score);
      localStorage.setItem('flappybird-highScore', score.toString());
    }
  }, [score, localHighScore]);

  useEffect(() => {
    const s = connectSocket();
    const fetchLeaderboard = () => {
      emitWithAck('leaderboard:get', 'flappy-bird').then((res) => {
        if (res?.ok) setGlobalLeaderboard(res.leaderboard);
      });
    };
    const handleLeaderboardUpdate = (newLeaderboard) => setGlobalLeaderboard(newLeaderboard);

    if (s.connected) fetchLeaderboard();
    else s.on('connect', fetchLeaderboard);
    s.on('leaderboard:update:flappy-bird', handleLeaderboardUpdate);

    return () => {
      s.off('leaderboard:update:flappy-bird', handleLeaderboardUpdate);
      s.off('connect', fetchLeaderboard);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    if (gameOver && !hasSubmittedScore && score > 0) {
      setHasSubmittedScore(true);
      emitWithAck('leaderboard:submit', { gameId: 'flappy-bird', name: playerName, score: score });
    }
  }, [gameOver, hasSubmittedScore, score, playerName]);

  const jump = useCallback(() => {
    if (physicsRef.current.isGameOver) return;
    
    if (!physicsRef.current.hasStarted) {
      if (countdownIntervalRef.current === null && countdown === null) {
        setCountdown(3);
        countdownIntervalRef.current = setInterval(() => {
          setCountdown((prev) => {
            if (prev <= 1) {
              clearInterval(countdownIntervalRef.current);
              countdownIntervalRef.current = null;
              physicsRef.current.hasStarted = true;
              setGameStarted(true);
              setHasSubmittedScore(false);
              physicsRef.current.birdV = JUMP_STRENGTH; 
              return null;
            }
            return prev - 1;
          });
        }, 1000);
      }
      return; 
    }
    physicsRef.current.birdV = JUMP_STRENGTH;
  }, [countdown]);

  const resetGame = () => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    setCountdown(null);
    lastTimeRef.current = 0; // Reset time tracker
    
    physicsRef.current = {
      birdY: CANVAS_HEIGHT / 2,
      birdV: 0,
      pipes: [],
      score: 0,
      isGameOver: false,
      hasStarted: false,
    };
    framesCount.current = 0;
    setScore(0);
    setGameOver(false);
    setGameStarted(false);
    setHasSubmittedScore(false);
    setGameState({ birdY: CANVAS_HEIGHT / 2, birdV: 0, pipes: [] });
  };

  const spawnPipe = () => {
    const { gap } = getDifficultyParams(physicsRef.current.score);
    
    const minPipeHeight = 50;
    const maxPipeHeight = CANVAS_HEIGHT - gap - minPipeHeight;
    const topHeight = Math.floor(Math.random() * (maxPipeHeight - minPipeHeight + 1)) + minPipeHeight;
    
    // Push the gap so the gameLoop can access it!
    physicsRef.current.pipes.push({ x: CANVAS_WIDTH, topHeight: topHeight, gap: gap, passed: false });
  };

  const gameLoop = useCallback((timestamp) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const dt = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    if (dt > 100) {
      frameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const timeScale = dt / (1000 / 60);

    if (physicsRef.current.isGameOver || !physicsRef.current.hasStarted) {
      frameRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const state = physicsRef.current;
    
    // Dynamically scale game properties based on current score
    const { speed, spawnRate } = getDifficultyParams(state.score);

    // Apply normalized Gravity
    state.birdV += GRAVITY * timeScale;
    state.birdY += state.birdV * timeScale;

    if (state.birdY + BIRD_SIZE >= CANVAS_HEIGHT || state.birdY <= 0) {
      state.isGameOver = true;
      setGameOver(true);
    }

    // Normalized Spawn Timer using dynamic spawnRate
    framesCount.current += timeScale;
    if (framesCount.current >= spawnRate) {
      spawnPipe();
      framesCount.current = 0; // Reset after spawning
    }

    state.pipes.forEach(pipe => {
      // Use dynamic speed
      pipe.x -= speed * timeScale;

      const birdRect = { left: BIRD_X, right: BIRD_X + BIRD_SIZE, top: state.birdY, bottom: state.birdY + BIRD_SIZE };
      const topPipeRect = { left: pipe.x, right: pipe.x + PIPE_WIDTH, top: 0, bottom: pipe.topHeight };
      const bottomPipeRect = { left: pipe.x, right: pipe.x + PIPE_WIDTH, top: pipe.topHeight + pipe.gap, bottom: CANVAS_HEIGHT };

      if (
        (birdRect.right > topPipeRect.left && birdRect.left < topPipeRect.right && birdRect.top < topPipeRect.bottom) ||
        (birdRect.right > bottomPipeRect.left && birdRect.left < bottomPipeRect.right && birdRect.bottom > bottomPipeRect.top)
      ) {
        state.isGameOver = true;
        setGameOver(true);
      }

      if (pipe.x + PIPE_WIDTH < BIRD_X && !pipe.passed) {
        pipe.passed = true;
        state.score += 1;
        setScore(state.score);
      }
    });

    state.pipes = state.pipes.filter(p => p.x + PIPE_WIDTH > 0);

    setGameState({
      birdY: state.birdY,
      birdV: state.birdV,
      pipes: [...state.pipes] 
    });

    frameRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => {
    frameRef.current = requestAnimationFrame(gameLoop);
    
    const handleKeyDown = (e) => {
      if (e.code === 'Space') {
        e.preventDefault();
        jump();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [gameLoop, jump]);

  return (
    <div className="flex flex-col items-center min-h-screen pt-0 pb-10 sm:justify-center">
      <div className="w-full max-w-[600px] p-2 sm:p-4 relative z-10">
        <div className="flex flex-row justify-between items-center mb-2 sm:mb-8 border-b-[3px] border-black pb-2 sm:pb-4 gap-2">
          <h1 className="text-3xl sm:text-5xl font-black text-black tracking-tighter uppercase shrink-0 leading-none">
            Flappy<br/>Bird
          </h1>
          <div className="flex gap-2 sm:gap-4 shrink-0">
            <div className="bg-[#ff99c8] border-[3px] border-black shadow-[2px_2px_0_0_#000] sm:shadow-[4px_4px_0_0_#000] px-2 sm:px-4 py-1 sm:py-2 text-black text-center min-w-[70px] sm:min-w-[90px]">
              <div className="text-[10px] sm:text-sm uppercase font-bold tracking-wider">Score</div>
              <div className="text-lg sm:text-2xl font-black leading-tight">{score}</div>
            </div>
            <div className="bg-[#ffd166] border-[3px] border-black shadow-[2px_2px_0_0_#000] sm:shadow-[4px_4px_0_0_#000] px-2 sm:px-4 py-1 sm:py-2 text-black text-center min-w-[70px] sm:min-w-[90px]">
              <div className="text-[10px] sm:text-sm uppercase font-bold tracking-wider">High Score</div>
              <div className="text-lg sm:text-2xl font-black leading-tight">{localHighScore}</div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between items-center mb-4 sm:mb-6 gap-4">
          <button 
            onClick={() => navigate('/')} 
            className="flex-1 bg-[#48cae4] border-[3px] border-black shadow-[4px_4px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-y-[4px] active:translate-x-[4px] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] transition-all text-black font-bold py-2 px-2 sm:px-4 text-sm sm:text-base uppercase cursor-pointer"
          >
            &larr; Back
          </button>
        </div>

        <div 
          className="mx-auto bg-white border-[4px] border-black shadow-[8px_8px_0_0_#000] relative overflow-hidden mb-8 touch-none select-none cursor-pointer"
          style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }}
          onPointerDown={jump}
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMjBoMjBWMEgwem0xOS0xdjEtMWgtMXYxLTEtMS0xIiBmaWxsPSJub25lIiBzdHJva2U9IiNlNWU3ZWIiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] opacity-50 z-0 pointer-events-none" />

          {!gameStarted && !gameOver && countdown === null && (
            <div className="absolute inset-0 flex items-center justify-center z-30 bg-white/50 backdrop-blur-[2px]">
              <div className="bg-[#fcf6bd] border-[3px] border-black shadow-[4px_4px_0_0_#000] p-4 text-center animate-bounce">
                <p className="font-black text-xl uppercase">Tap or Space<br/>to Start!</p>
              </div>
            </div>
          )}

          {!gameStarted && countdown !== null && (
            <div className="absolute inset-0 flex items-center justify-center z-30 bg-white/50 backdrop-blur-[2px]">
              <div className="text-7xl font-black text-[#ef476f] animate-ping" style={{ textShadow: '4px 4px 0 #000' }}>
                {countdown}
              </div>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center">
              <div className="bg-[#ef476f] border-[4px] border-black shadow-[6px_6px_0_0_#000] p-4 sm:p-6 text-center transform -rotate-2">
                <h2 className="text-3xl font-black text-white mb-4 uppercase">Game Over!</h2>
                <button 
                  onClick={(e) => { e.stopPropagation(); resetGame(); }}
                  className="bg-[#06d6a0] border-[3px] border-black shadow-[4px_4px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-y-[4px] active:translate-x-[4px] text-black font-bold py-2 px-6 text-xl uppercase transition-all cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          <div 
            className="absolute z-20 bg-[#ffd166] border-[3px] border-black shadow-[2px_2px_0_0_#000] rounded-sm transition-transform duration-75"
            style={{ 
              width: BIRD_SIZE, height: BIRD_SIZE, left: BIRD_X, top: gameState.birdY,
              transform: `rotate(${Math.min(Math.max(gameState.birdV * 4, -25), 90)}deg)` 
            }}
          >
            <div className="absolute top-1 right-2 w-2 h-2 bg-white border-[1px] border-black rounded-full flex items-center justify-center">
                <div className="w-1 h-1 bg-black rounded-full" />
            </div>
            <div className="absolute top-3 right-[-6px] w-3 h-2 bg-[#ff99c8] border-[1px] border-black rounded-r-full" />
          </div>

          {gameState.pipes.map((pipe, idx) => (
            <React.Fragment key={idx}>
              <div 
                className="absolute z-10 bg-[#06d6a0] border-[3px] border-black shadow-[4px_4px_0_0_#000]"
                style={{ left: pipe.x, top: 0, width: PIPE_WIDTH, height: pipe.topHeight }}
              >
                <div className="absolute bottom-[-3px] left-[-4px] right-[-4px] h-6 bg-[#06d6a0] border-[3px] border-black" />
              </div>
              <div 
                className="absolute z-10 bg-[#06d6a0] border-[3px] border-black shadow-[4px_4px_0_0_#000]"
                // Updated to use the specific pipe's gap
                style={{ left: pipe.x, top: pipe.topHeight + pipe.gap, width: PIPE_WIDTH, height: CANVAS_HEIGHT - (pipe.topHeight + pipe.gap) }}
              >
                 <div className="absolute top-[-3px] left-[-4px] right-[-4px] h-6 bg-[#06d6a0] border-[3px] border-black" />
              </div>
            </React.Fragment>
          ))}
          <div className="absolute bottom-0 left-0 right-0 h-4 bg-[#fcf6bd] border-t-[3px] border-black z-20" />
        </div>

        <div className="bg-white border-[4px] border-black shadow-[6px_6px_0_0_#000] p-4 sm:p-6 w-full transform -rotate-1">
          <h3 className="text-xl sm:text-2xl font-black uppercase text-black mb-4 flex items-center justify-between">
            <span>Global Top 3</span>
          </h3>
          
          {globalLeaderboard.length === 0 ? (
            <div className="bg-gray-100 border-[3px] border-dashed border-gray-400 p-4 text-center">
              <p className="font-bold text-gray-500 uppercase tracking-widest">No scores yet. Take the crown!</p>
            </div>
          ) : (
            <ul className="flex flex-col gap-3">
              {globalLeaderboard.map((entry, idx) => {
                const rankColors = ['bg-[#ffd166]', 'bg-[#d0f4de]', 'bg-[#ffb5a7]'];
                const bgColor = rankColors[idx] || 'bg-white';
                return (
                  <li key={entry.id || idx} className={`${bgColor} border-[3px] border-black p-3 sm:p-4 shadow-[4px_4px_0_0_#000] flex justify-between items-center transition-transform hover:-translate-y-1`}>
                    <div className="flex items-center gap-3 sm:gap-4">
                      <span className="text-lg sm:text-xl font-black bg-white border-[2px] border-black rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shadow-[2px_2px_0_0_#000]">#{idx + 1}</span>
                      <span className="font-black uppercase text-base sm:text-lg tracking-wider">{entry.name}</span>
                    </div>
                    <span className="font-black text-xl sm:text-2xl">{entry.score}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
