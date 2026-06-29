import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export default function DinoDash() {
  const navigate = useNavigate();
  
  // Game State Refs (using refs for the 60fps game loop physics to avoid React batching lag)
  const physicsRef = useRef({
    dinoY: 0,
    velocityY: 0,
    obstacles: [],
    score: 0,
    frames: 0,
    isGameOver: false,
    isPlaying: false,
    speed: 6
  });

  // Render State (syncs with refs to update the screen)
  const [renderState, setRenderState] = useState({
    dinoY: 0,
    obstacles: [],
    score: 0,
    isGameOver: false,
    isPlaying: false
  });

  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('dinodash-highScore');
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  const requestRef = useRef();

  // Physics Constants
  const GRAVITY = 0.7;
  const JUMP_POWER = 13;
  const GAME_SPEED_MULTIPLIER = 0.001; // How fast the game speeds up over time
  const MIN_OBSTACLE_GAP = 60; // Minimum frames between obstacles

  const startGame = () => {
    physicsRef.current = {
      dinoY: 0,
      velocityY: 0,
      obstacles: [],
      score: 0,
      frames: 0,
      isGameOver: false,
      isPlaying: true,
      speed: 6
    };
    updateRenderState();
  };

  const updateRenderState = () => {
    setRenderState({
      dinoY: physicsRef.current.dinoY,
      obstacles: [...physicsRef.current.obstacles],
      score: Math.floor(physicsRef.current.score),
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
    // Only jump if on the ground
    if (state.dinoY === 0) {
      state.velocityY = JUMP_POWER;
    }
  }, []);

  const gameLoop = useCallback(() => {
    const state = physicsRef.current;

    if (state.isPlaying && !state.isGameOver) {
      state.frames++;
      state.score += 0.1;
      state.speed += GAME_SPEED_MULTIPLIER;

      // Gravity & Jumping
      state.dinoY += state.velocityY;
      state.velocityY -= GRAVITY;

      if (state.dinoY <= 0) {
        state.dinoY = 0;
        state.velocityY = 0;
      }

      // Obstacle Generation
      if (
        state.frames > MIN_OBSTACLE_GAP && 
        (state.obstacles.length === 0 || state.obstacles[state.obstacles.length - 1].x < 300) &&
        Math.random() < 0.02
      ) {
        state.obstacles.push({
          id: state.frames,
          x: 500, // Spawn offscreen right
          width: Math.random() > 0.5 ? 40 : 25, // Randomize obstacle size slightly
          height: Math.random() > 0.5 ? 50 : 35
        });
      }

      // Move and Filter Obstacles
      state.obstacles.forEach(obs => {
        obs.x -= state.speed;
      });
      state.obstacles = state.obstacles.filter(obs => obs.x > -50);

      // Collision Detection (AABB)
      const dinoBox = { x: 40, y: state.dinoY, width: 40, height: 40 }; // Left fixed at 40
      for (let obs of state.obstacles) {
        const obsBox = { x: obs.x, y: 0, width: obs.width, height: obs.height };
        
        if (
          dinoBox.x < obsBox.x + obsBox.width &&
          dinoBox.x + dinoBox.width > obsBox.x &&
          dinoBox.y < obsBox.y + obsBox.height
        ) {
          state.isGameOver = true;
          state.isPlaying = false;
          
          if (Math.floor(state.score) > highScore) {
            setHighScore(Math.floor(state.score));
            localStorage.setItem('dinodash-highScore', Math.floor(state.score).toString());
          }
        }
      }

      updateRenderState();
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [highScore]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameLoop]);

  // Keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [jump]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-[var(--font-family,'Comic_Sans_MS',cursive)] bg-transparent overflow-hidden select-none">
      <div className="w-full max-w-[500px] p-4">
        
        {/* Header */}
        <div className="flex flex-row justify-between items-center mb-6 sm:mb-8 border-b-[3px] border-black pb-4 gap-2">
          <h1 className="text-3xl sm:text-5xl font-black text-black tracking-tighter uppercase shrink-0 leading-none">
            Dino<br/>Dash
          </h1>
          
          <div className="flex gap-2 sm:gap-4 shrink-0">
            <div className="bg-[#a9def9] border-[3px] border-black shadow-[2px_2px_0_0_#000] sm:shadow-[4px_4px_0_0_#000] px-2 sm:px-4 py-1 sm:py-2 text-black text-center min-w-[70px] sm:min-w-[90px]">
              <div className="text-[10px] sm:text-sm uppercase font-bold tracking-wider">Score</div>
              <div className="text-lg sm:text-2xl font-black leading-tight">{renderState.score}</div>
            </div>
            <div className="bg-[#ffd166] border-[3px] border-black shadow-[2px_2px_0_0_#000] sm:shadow-[4px_4px_0_0_#000] px-2 sm:px-4 py-1 sm:py-2 text-black text-center min-w-[70px] sm:min-w-[90px]">
              <div className="text-[10px] sm:text-sm uppercase font-bold tracking-wider">Best</div>
              <div className="text-lg sm:text-2xl font-black leading-tight">{highScore}</div>
            </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex justify-between items-center mb-4 sm:mb-6 gap-4">
          <button 
            onClick={() => navigate('/')} 
            className="flex-1 bg-[#48cae4] border-[3px] border-black shadow-[4px_4px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-y-[4px] active:translate-x-[4px] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] transition-all text-black font-bold py-2 px-2 sm:px-4 text-sm sm:text-base uppercase cursor-pointer"
          >
            &larr; Back
          </button>
        </div>

        {/* Game Area */}
        <div 
          className="bg-white border-[4px] border-black shadow-[6px_6px_0_0_#000] sm:shadow-[8px_8px_0_0_#000] relative mx-auto w-full h-[250px] sm:h-[300px] mb-6 overflow-hidden cursor-pointer touch-manipulation"
          onPointerDown={jump}
        >
          {/* Start Screen */}
          {!renderState.isPlaying && !renderState.isGameOver && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-white/50 backdrop-blur-[2px]">
              <div className="bg-[#fcf6bd] border-[3px] border-black shadow-[4px_4px_0_0_#000] p-4 text-center transform -rotate-2 animate-pulse">
                <h2 className="text-2xl font-black text-black uppercase">Tap to Start!</h2>
              </div>
            </div>
          )}

          {/* Game Over Screen */}
          {renderState.isGameOver && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center">
              <div className="bg-[#ef476f] border-[4px] border-black shadow-[6px_6px_0_0_#000] p-4 sm:p-6 text-center transform -rotate-2">
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 uppercase">Crashed!</h2>
                <button 
                  onClick={(e) => { e.stopPropagation(); startGame(); }}
                  className="bg-[#06d6a0] border-[3px] border-black shadow-[4px_4px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-y-[4px] active:translate-x-[4px] text-black font-bold py-2 px-4 text-lg uppercase transition-all cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}

          {/* Sky Details */}
          <div className="absolute top-4 left-10 w-16 h-6 bg-[#a9def9] rounded-full opacity-50"></div>
          <div className="absolute top-10 right-20 w-24 h-8 bg-[#a9def9] rounded-full opacity-50"></div>

          {/* Ground */}
          <div className="absolute bottom-0 w-full h-2 border-t-[4px] border-black bg-black"></div>

          {/* The Dino */}
          <div 
            className="absolute left-[40px] w-[40px] h-[40px] bg-[#ef476f] border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] flex justify-end p-1"
            style={{ bottom: `${renderState.dinoY}px` }}
          >
            {/* Dino Eye */}
            <div className={`w-2 h-2 bg-white border border-black ${renderState.isGameOver ? 'flex items-center justify-center' : ''}`}>
               {renderState.isGameOver && <div className="w-1 h-1 bg-black"></div>}
            </div>
          </div>

          {/* Obstacles */}
          {renderState.obstacles.map(obs => (
            <div 
              key={obs.id}
              className="absolute bg-[#06d6a0] border-[3px] border-black shadow-[4px_4px_0_0_rgba(0,0,0,0.5)]"
              style={{
                left: `${obs.x}px`,
                bottom: '0px',
                width: `${obs.width}px`,
                height: `${obs.height}px`
              }}
            >
              {/* Cactus Spike Details */}
              <div className="absolute top-2 -left-2 w-3 h-4 border-[2px] border-r-0 border-black rounded-l-sm bg-[#06d6a0]"></div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-black text-center px-4 font-bold uppercase tracking-wider text-[11px] sm:text-sm bg-white border-[3px] border-black p-2 sm:p-3 shadow-[4px_4px_0_0_#000] transform rotate-1">
          Tap the game area or press SPACE to jump!
        </p>

      </div>
    </div>
  );
}