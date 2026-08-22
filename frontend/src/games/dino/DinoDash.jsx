import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';

export default function DinoDash() {
  const navigate = useNavigate();
  
  // Game State Refs
  const physicsRef = useRef({
    dinoY: 0,
    velocityY: 0,
    obstacles: [],
    score: 0,
    frames: 0,
    isGameOver: false,
    isPlaying: false,
    speed: 0, 
    nextSpawnFrame: 0 
  });

  const [renderState, setRenderState] = useState({
    dinoY: 0, obstacles: [], score: 0, frames: 0, isGameOver: false, isPlaying: false
  });

  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [hasSubmittedScore, setHasSubmittedScore] = useState(false);
  
  const playerName = localStorage.getItem('Doozles-player-name') || 'Player';
  const [localHighScore, setLocalHighScore] = useState(() => {
    const saved = localStorage.getItem('dinodash-highScore');
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    if (renderState.score > localHighScore) {
      setLocalHighScore(renderState.score);
      localStorage.setItem('dinodash-highScore', renderState.score.toString());
    }
  }, [renderState.score, localHighScore]);

  const requestRef = useRef();
  const lastTimeRef = useRef(0); // For Delta Time

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      e.preventDefault();
      e.returnValue = ''; 
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Physics Constants
  const GRAVITY = 0.7;
  const JUMP_POWER = 13;
  const MAX_SPEED = 14; 
  const GAME_SPEED_MULTIPLIER = 0.003; 

  useEffect(() => {
    const s = connectSocket();
    const fetchLeaderboard = () => {
      emitWithAck('leaderboard:get', 'dino').then((res) => {
        if (res?.ok) setGlobalLeaderboard(res.leaderboard);
      });
    };
    const handleLeaderboardUpdate = (newLeaderboard) => setGlobalLeaderboard(newLeaderboard);

    if (s.connected) fetchLeaderboard();
    else s.on('connect', fetchLeaderboard);

    s.on('leaderboard:update:dino', handleLeaderboardUpdate);
    return () => {
      s.off('leaderboard:update:dino', handleLeaderboardUpdate);
      s.off('connect', fetchLeaderboard);
    };
  }, []);

  useEffect(() => {
    if (renderState.isGameOver && !hasSubmittedScore && renderState.score > 0) {
      setHasSubmittedScore(true);
      emitWithAck('leaderboard:submit', { gameId: 'dino', name: playerName, score: renderState.score });
    }
  }, [renderState.isGameOver, hasSubmittedScore, renderState.score, playerName]);

  const startGame = () => {
    setHasSubmittedScore(false); 
    lastTimeRef.current = 0; // Reset timer
    physicsRef.current = {
      dinoY: 0, velocityY: 0, obstacles: [], score: 0, frames: 0,
      isGameOver: false, isPlaying: true, speed: 4, nextSpawnFrame: 50 
    };
    updateRenderState();
  };

  const updateRenderState = () => {
    setRenderState({
      dinoY: physicsRef.current.dinoY,
      obstacles: [...physicsRef.current.obstacles],
      score: Math.floor(physicsRef.current.score),
      frames: physicsRef.current.frames,
      isGameOver: physicsRef.current.isGameOver,
      isPlaying: physicsRef.current.isPlaying
    });
  };

  const jump = useCallback(() => {
    const state = physicsRef.current;
    if (!state.isPlaying) {
      if (state.isGameOver) startGame();
      else startGame();
      return;
    }
    if (state.dinoY === 0) state.velocityY = JUMP_POWER;
  }, []);

  const gameLoop = useCallback((timestamp) => {
    if (!lastTimeRef.current) lastTimeRef.current = timestamp;
    const dt = timestamp - lastTimeRef.current;
    lastTimeRef.current = timestamp;

    if (dt > 100) {
      requestRef.current = requestAnimationFrame(gameLoop);
      return;
    }

    const timeScale = dt / (1000 / 60);
    const state = physicsRef.current;

    if (state.isPlaying && !state.isGameOver) {
      // Normalized Score and Frame Timers
      state.frames += timeScale;
      state.score += (state.speed * 0.02) * timeScale; 
      
      if (state.speed < MAX_SPEED) {
        state.speed += GAME_SPEED_MULTIPLIER * timeScale;
      }

      // Normalized Gravity
      state.dinoY += state.velocityY * timeScale;
      state.velocityY -= GRAVITY * timeScale;

      if (state.dinoY <= 0) {
        state.dinoY = 0;
        state.velocityY = 0;
      }

      if (state.frames >= state.nextSpawnFrame) {
        const obstacleTypes = [
          { width: 22, height: 40, type: 'small' },
          { width: 28, height: 55, type: 'large' },
          { width: 45, height: 45, type: 'double' } 
        ];
        
        const config = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
        
        state.obstacles.push({
          id: state.frames, x: 550, width: config.width, height: config.height, type: config.type
        });

        const baseGap = Math.max(35, 100 - (state.speed * 5)); 
        const randomVariance = Math.random() * 40;
        state.nextSpawnFrame = state.frames + baseGap + randomVariance;
      }

      // Normalized Obstacle Movement
      state.obstacles.forEach(obs => {
        obs.x -= state.speed * timeScale;
      });
      state.obstacles = state.obstacles.filter(obs => obs.x > -60);

      const dinoBox = { x: 40, y: state.dinoY, width: 40, height: 40 }; 
      for (let obs of state.obstacles) {
        const obsBox = { x: obs.x, y: 0, width: obs.width, height: obs.height };
        if (
          dinoBox.x < obsBox.x + obsBox.width &&
          dinoBox.x + dinoBox.width > obsBox.x &&
          dinoBox.y < obsBox.y + obsBox.height
        ) {
          state.isGameOver = true;
          state.isPlaying = false;
        }
      }
      updateRenderState();
    }
    requestRef.current = requestAnimationFrame(gameLoop);
  }, []);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameLoop]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  const isRunning = renderState.isPlaying && renderState.dinoY === 0;
  const showLeftLeg = isRunning && (renderState.frames % 12 < 6);
  const showRightLeg = isRunning && (renderState.frames % 12 >= 6);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-[var(--font-family,'Comic_Sans_MS',cursive)] bg-transparent overflow-hidden select-none py-6 sm:py-10">
      <div className="w-full max-w-[500px] sm:max-w-[700px] md:max-w-[850px] p-2 sm:p-4">
        
        {/* Header */}
        <div className="flex flex-row justify-between items-center mb-2 sm:mb-8 border-b-[3px] border-black pb-2 gap-2">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-black tracking-tighter uppercase shrink-0 leading-none">Dino<br/>Dash</h1>
          <div className="flex gap-2 sm:gap-4 shrink-0">
            <div className="bg-[#a9def9] border-[3px] border-black shadow-[2px_2px_0_0_#000] sm:shadow-[4px_4px_0_0_#000] px-2 sm:px-4 py-1 sm:py-2 text-black text-center min-w-[70px] sm:min-w-[90px]">
              <div className="text-[10px] sm:text-sm uppercase font-bold tracking-wider">Score</div>
              <div className="text-lg sm:text-2xl font-black leading-tight">{renderState.score}</div>
            </div>
            <div className="bg-[#ffd166] border-[3px] border-black shadow-[2px_2px_0_0_#000] sm:shadow-[4px_4px_0_0_#000] px-2 sm:px-4 py-1 sm:py-2 text-black text-center min-w-[70px] sm:min-w-[90px]">
              <div className="text-[10px] sm:text-sm uppercase font-bold tracking-wider">High Score</div>
              <div className="text-lg sm:text-2xl font-black leading-tight">{localHighScore}</div>
            </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex justify-between items-center mb-2 sm:mb-6 gap-4">
          <button onClick={() => navigate('/single-player')} className="flex-1 bg-[#48cae4] border-[3px] border-black shadow-[4px_4px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-y-[4px] active:translate-x-[4px] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] transition-all text-black font-bold py-2 px-2 sm:px-4 text-sm sm:text-base uppercase cursor-pointer">&larr; Back</button>
        </div>

        {/* Game Area */}
        <div className="bg-white border-[4px] border-black shadow-[6px_6px_0_0_#000] sm:shadow-[8px_8px_0_0_#000] relative mx-auto w-full h-[35vh] min-h-[220px] sm:h-[340px] md:h-[380px] mb-2 overflow-hidden cursor-pointer touch-manipulation group" onPointerDown={jump}>

          {!renderState.isPlaying && !renderState.isGameOver && (
            <div className="absolute inset-0 flex items-center justify-center z-30 bg-white/40 backdrop-blur-[2px]">
              <div className="bg-[#fcf6bd] border-[3px] border-black shadow-[4px_4px_0_0_#000] p-4 text-center transform -rotate-2 animate-pulse transition-transform group-hover:scale-105"><h2 className="text-2xl font-black text-black uppercase">Tap to Start!</h2></div>
            </div>
          )}
          {renderState.isGameOver && (
            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm z-30 flex flex-col items-center justify-center">
              <div className="bg-[#ef476f] border-[4px] border-black shadow-[6px_6px_0_0_#000] p-4 sm:p-6 text-center transform -rotate-2">
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 uppercase">Crashed!</h2>
                <button onClick={(e) => { e.stopPropagation(); startGame(); }} className="bg-[#06d6a0] border-[3px] border-black shadow-[4px_4px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-y-[4px] active:translate-x-[4px] text-black font-bold py-2 px-4 text-lg uppercase transition-all cursor-pointer hover:scale-105">Try Again</button>
              </div>
            </div>
          )}

          {/* Scenery Style */}
          <style>{`
            @keyframes dinoGroundScroll {
              from { background-position-x: 0px; }
              to { background-position-x: 40px; }
            }
            @keyframes dinoCloudScroll {
              from { transform: translateX(0); }
              to { transform: translateX(-50%); }
            }
            .dino-ground-track {
              animation: dinoGroundScroll 0.25s linear infinite;
              background-image: repeating-linear-gradient(90deg, #18181b 0 16px, #27272a 16px 20px, #18181b 20px 36px, #71717a 36px 40px);
            }
            .dino-clouds {
              animation: dinoCloudScroll 20s linear infinite;
              background-image: radial-gradient(circle 12px at 15px 15px, rgba(255,255,255,0.9) 98%, transparent), radial-gradient(circle 18px at 35px 12px, rgba(255,255,255,0.9) 98%, transparent), radial-gradient(circle 14px at 55px 16px, rgba(255,255,255,0.9) 98%, transparent);
            }
            .dino-paused {
              animation-play-state: paused !important;
            }
          `}</style>

          {/* Desert Sunset Sky */}
          <div className="absolute inset-0 bg-gradient-to-b from-[#fef08a] via-[#fed7aa] to-[#fbcfe8] pointer-events-none" />

          {/* Retro Sun */}
          <div className="absolute top-4 right-12 w-14 h-14 bg-amber-400 rounded-full border-[3px] border-black shadow-[0_0_20px_rgba(251,191,36,0.5)] pointer-events-none opacity-80 flex items-center justify-center">
            <div className="w-8 h-8 bg-yellow-200 rounded-full border border-black/30" />
          </div>

          {/* Distant Desert Dunes Silhouette */}
          <div className="absolute bottom-3 left-0 right-0 h-16 pointer-events-none opacity-35 flex items-end">
            <div className="w-36 h-12 bg-[#fb7185] rounded-t-full border-t-2 border-black -ml-4" />
            <div className="w-48 h-16 bg-[#f43f5e] rounded-t-full border-t-2 border-black -ml-10" />
            <div className="w-40 h-10 bg-[#fb7185] rounded-t-full border-t-2 border-black -ml-8" />
            <div className="w-56 h-14 bg-[#f43f5e] rounded-t-full border-t-2 border-black -ml-12" />
          </div>

          {/* Moving Clouds */}
          <div className={`dino-clouds absolute top-2 left-0 w-[200%] h-8 pointer-events-none opacity-80 ${renderState.isPlaying && !renderState.isGameOver ? '' : 'dino-paused'}`} />

          {/* Textured Ground */}
          <div className={`dino-ground-track absolute bottom-0 left-0 right-0 h-3 border-t-[3px] border-black z-20 ${renderState.isPlaying && !renderState.isGameOver ? '' : 'dino-paused'}`} />

          {/* THE ENHANCED DINO T-REX */}
          <div 
            className="absolute left-[40px] z-20 transition-transform duration-75 select-none"
            style={{ 
              bottom: `${renderState.dinoY + 12}px`,
              transform: renderState.dinoY > 0 ? 'rotate(-6deg)' : 'rotate(0deg)'
            }}
          >
            {/* T-Rex Body SVG */}
            <div className="relative w-12 h-12">
              {/* Back Spines */}
              <div className="absolute top-2 left-0 w-2 h-2 bg-[#15803d] border border-black -rotate-45" />
              <div className="absolute top-4 left-0 w-2 h-2 bg-[#15803d] border border-black -rotate-45" />
              <div className="absolute top-6 left-1 w-2 h-2 bg-[#15803d] border border-black -rotate-45" />

              {/* Main Body */}
              <div className="absolute top-2 left-2 w-7 h-8 bg-[#22c55e] border-[3px] border-black rounded-lg shadow-[2px_2px_0px_#000]" />

              {/* Head & Snout */}
              <div className="absolute top-0 left-4 w-7 h-5 bg-[#22c55e] border-[3px] border-black rounded-r-md">
                {/* Eye */}
                <div className="absolute top-1 left-1.5 w-2 h-2 bg-white border border-black rounded-full flex items-center justify-center">
                  {renderState.isGameOver ? (
                    <span className="text-[7px] font-black leading-none text-black">x</span>
                  ) : (
                    <div className="w-1 h-1 bg-black rounded-full" />
                  )}
                </div>
                {/* Teeth */}
                <div className="absolute bottom-[-1px] right-0 flex">
                  <div className="w-1 h-1 bg-white border-r border-black" />
                  <div className="w-1 h-1 bg-white border-r border-black" />
                </div>
              </div>

              {/* Little Arm */}
              <div className="absolute top-5 right-2 w-2.5 h-1.5 bg-[#15803d] border-[2px] border-black rounded-r-full" />

              {/* Tail */}
              <div className="absolute top-5 -left-2 w-3.5 h-3.5 bg-[#22c55e] border-[2px] border-r-0 border-b-0 border-black -rotate-45 rounded-tl-sm" />

              {/* Left Leg */}
              <div 
                className={`absolute bottom-[-6px] left-3 w-2 bg-[#15803d] border-[2px] border-t-0 border-black transition-all ${
                  !showLeftLeg && renderState.isPlaying ? 'h-1 bottom-[-2px]' : 'h-3'
                }`}
              />

              {/* Right Leg */}
              <div 
                className={`absolute bottom-[-6px] left-6 w-2 bg-[#15803d] border-[2px] border-t-0 border-black transition-all ${
                  !showRightLeg && renderState.isPlaying ? 'h-1 bottom-[-2px]' : 'h-3'
                }`}
              />
            </div>
          </div>

          {/* OBSTACLES (CACTI) */}
          {renderState.obstacles.map(obs => (
            <div key={obs.id} className="absolute flex items-end justify-center z-10" style={{ left: `${obs.x}px`, bottom: '12px', width: `${obs.width}px`, height: `${obs.height}px` }}>
              {obs.type === 'small' && (
                <div className="w-full h-full bg-[#10b981] border-[3px] border-black rounded-t-md relative shadow-[2px_2px_0px_#000]">
                   <div className="absolute top-2 -left-[6px] w-[10px] h-[12px] bg-[#10b981] border-[3px] border-r-0 border-black rounded-l-sm"></div>
                </div>
              )}
              {obs.type === 'large' && (
                <div className="w-full h-full bg-[#10b981] border-[3px] border-black rounded-t-md relative shadow-[3px_3px_0px_#000]">
                   <div className="absolute top-3 -left-[8px] w-[12px] h-[16px] bg-[#10b981] border-[3px] border-r-0 border-b-0 border-black rounded-tl-sm"></div>
                   <div className="absolute top-7 -right-[8px] w-[12px] h-[14px] bg-[#10b981] border-[3px] border-l-0 border-t-0 border-black rounded-br-sm"></div>
                </div>
              )}
              {obs.type === 'double' && (
                <div className="w-full h-full flex justify-between items-end">
                   <div className="w-[18px] h-[35px] bg-[#10b981] border-[3px] border-black rounded-t-md relative shadow-[2px_2px_0px_#000]"></div>
                   <div className="w-[22px] h-full bg-[#10b981] border-[3px] border-black rounded-t-md relative shadow-[2px_2px_0px_#000]">
                     <div className="absolute top-3 -right-[6px] w-[10px] h-[12px] bg-[#10b981] border-[3px] border-l-0 border-t-0 border-black rounded-br-sm"></div>
                   </div>
                </div>
              )}
            </div>
          ))}
        </div>


        {/* Jump Button */}
        <button onPointerDown={(e) => { e.preventDefault(); jump(); }} className="w-full mt-2 bg-[#ff99c8] border-[4px] border-black shadow-[6px_6px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-y-[6px] active:translate-x-[6px] transition-all text-black font-black py-3 sm:py-6 text-2xl sm:text-4xl uppercase tracking-widest cursor-pointer touch-manipulation block">
          JUMP
        </button>

        <p className="mt-2 mb-8 text-black text-center px-4 font-bold uppercase tracking-wider text-[10px] sm:text-xs opacity-70">
          Keyboard: Space / W / Up Arrow
        </p>

        {/* --- GLOBAL TOP 3 LEADERBOARD --- */}
        <div className="bg-white border-[4px] border-black shadow-[6px_6px_0_0_#000] p-4 sm:p-6 w-full transform -rotate-1">
          <h3 className="text-xl sm:text-2xl font-black uppercase text-black mb-4 flex items-center justify-between"><span>Global Top 3</span></h3>
          {globalLeaderboard.length === 0 ? (
            <div className="bg-gray-100 border-[3px] border-dashed border-gray-400 p-4 text-center"><p className="font-bold text-gray-500 uppercase tracking-widest">No scores yet. Take the crown!</p></div>
          ) : (
            <ul className="flex flex-col gap-3">
              {globalLeaderboard.map((entry, idx) => {
                const rankColors = ['bg-[#ffd166]', 'bg-[#d0f4de]', 'bg-[#ffb5a7]'];
                const bgColor = rankColors[idx] || 'bg-white';
                return (
                  <li key={entry.id || idx} className={`${bgColor} border-[3px] border-black p-3 sm:p-4 shadow-[4px_4px_0_0_#000] flex justify-between items-center transition-transform hover:-translate-y-1`}>
                    <div className="flex items-center gap-3 sm:gap-4"><span className="text-lg sm:text-xl font-black bg-white border-[2px] border-black rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shadow-[2px_2px_0_0_#000]">#{idx + 1}</span><span className="font-black uppercase text-base sm:text-lg tracking-wider">{entry.name}</span></div>
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