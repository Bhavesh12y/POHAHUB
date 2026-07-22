import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';

export default function TrafficRun() {
  const navigate = useNavigate();
  
  // Game State
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  
  // Player Lane: 0 (Left), 1 (Middle), 2 (Right)
  const [playerLane, setPlayerLane] = useState(1);
  const [obstacles, setObstacles] = useState([]);
  
  // High Score & Leaderboard
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [hasSubmittedScore, setHasSubmittedScore] = useState(false);
  const playerName = localStorage.getItem('Doozles-player-name') || 'Player';
  
  const [localHighScore, setLocalHighScore] = useState(() => {
    const saved = localStorage.getItem('trafficrun-highScore');
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  // Refs for smooth animation loop without closure stale state
  const requestRef = useRef();
  const speedRef = useRef(1.5); // Initial speed
  const spawnTimerRef = useRef(0);
  const stateRef = useRef({ playerLane: 1, obstacles: [], score: 0, gameOver: false, gameStarted: false });

  // Swipe logic
  const [dragStart, setDragStart] = useState(null);
  const minSwipeDistance = 30;

  // Sync state to refs for the animation loop
  useEffect(() => {
    stateRef.current = { playerLane, obstacles, score, gameOver, gameStarted };
  }, [playerLane, obstacles, score, gameOver, gameStarted]);

  // Handle local high score updates
  useEffect(() => {
    if (score > localHighScore) {
      setLocalHighScore(score);
      localStorage.setItem('trafficrun-highScore', score.toString());
    }
  }, [score, localHighScore]);

  // -- FETCH AND SYNC LEADERBOARD --
  useEffect(() => {
    const s = connectSocket();
    const fetchLeaderboard = () => {
      emitWithAck('leaderboard:get', 'traffic-run').then((res) => {
        if (res?.ok) setGlobalLeaderboard(res.leaderboard);
      });
    };

    const handleLeaderboardUpdate = (newLeaderboard) => {
      setGlobalLeaderboard(newLeaderboard);
    };

    s.on('leaderboard:update:traffic-run', handleLeaderboardUpdate);
    if (s.connected) fetchLeaderboard();
    else s.on('connect', fetchLeaderboard);

    return () => {
      s.off('leaderboard:update:traffic-run', handleLeaderboardUpdate);
      s.off('connect', fetchLeaderboard);
    };
  }, []);

  // -- SUBMIT SCORE ON GAME OVER --
  useEffect(() => {
    if (gameOver && !hasSubmittedScore && score > 0) {
      setHasSubmittedScore(true);
      emitWithAck('leaderboard:submit', { 
        gameId: 'traffic-run', 
        name: playerName, 
        score: score 
      });
    }
  }, [gameOver, hasSubmittedScore, score, playerName]);

  // Prevent accidental navigation
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if(gameStarted && !gameOver) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [gameStarted, gameOver]);

  // -- GAME ENGINE / LOOP --
  const updateGame = useCallback(() => {
    if (!stateRef.current.gameStarted || stateRef.current.gameOver) return;

    let currentObs = [...stateRef.current.obstacles];
    let newScore = stateRef.current.score;
    let hit = false;

    // Move obstacles
    currentObs = currentObs.map(ob => ({
      ...ob,
      y: ob.y + speedRef.current
    }));

    // Collision Check (Player is at y: 80 to 95)
    currentObs.forEach(ob => {
      if (
        ob.lane === stateRef.current.playerLane && 
        ob.y + 15 > 80 && // Obstacle bottom edge passes player top edge
        ob.y < 95         // Obstacle top edge hasn't passed player bottom edge
      ) {
        hit = true;
      }
    });

    if (hit) {
      setGameOver(true);
      return; // Stop loop
    }

    // Score points and remove passed obstacles
    const passedObs = currentObs.filter(ob => ob.y > 100);
    if (passedObs.length > 0) {
      newScore += passedObs.length * 10;
      setScore(newScore);
      // Increase speed slightly every time we score
      speedRef.current = Math.min(speedRef.current + 0.05, 4.5);
    }
    currentObs = currentObs.filter(ob => ob.y <= 100);

    // Spawning Logic
    spawnTimerRef.current += 1;
    // Spawn rate speeds up as game goes on
    const spawnThreshold = Math.max(30, 100 - (speedRef.current * 10)); 
    
    if (spawnTimerRef.current > spawnThreshold) {
      spawnTimerRef.current = 0;
      // 30% chance for a 2-car blockade, otherwise 1 car
      const numCars = Math.random() > 0.7 ? 2 : 1;
      let lanes = [0, 1, 2].sort(() => 0.5 - Math.random()).slice(0, numCars);
      
      lanes.forEach(lane => {
        currentObs.push({ id: Math.random().toString(), lane, y: -20 });
      });
    }

    setObstacles(currentObs);
    requestRef.current = requestAnimationFrame(updateGame);
  }, []);

  useEffect(() => {
    if (gameStarted && !gameOver) {
      requestRef.current = requestAnimationFrame(updateGame);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameStarted, gameOver, updateGame]);

  // -- CONTROLS --
  const moveLeft = useCallback(() => {
    setPlayerLane(prev => Math.max(0, prev - 1));
  }, []);

  const moveRight = useCallback(() => {
    setPlayerLane(prev => Math.min(2, prev + 1));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'a', 'd'].includes(e.key)) e.preventDefault();
      if (!gameStarted || gameOver) return;
      
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') moveLeft();
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') moveRight();
    };
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameStarted, gameOver, moveLeft, moveRight]);

  const handlePointerDown = (e) => {
    e.target.setPointerCapture(e.pointerId);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e) => {
    e.target.releasePointerCapture(e.pointerId);
    if (!dragStart) return;
    const distanceX = dragStart.x - e.clientX;
    setDragStart(null);
    if (distanceX > minSwipeDistance) moveLeft();
    if (distanceX < -minSwipeDistance) moveRight();
  };

  const startNewGame = () => {
    setObstacles([]);
    setScore(0);
    setPlayerLane(1);
    setGameOver(false);
    setHasSubmittedScore(false);
    speedRef.current = 1.0;
    spawnTimerRef.current = 0;
    setGameStarted(true);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-[var(--font-family,'Comic_Sans_MS',cursive)] bg-transparent overflow-hidden py-10">
      <div className="w-full max-w-[500px] p-2 sm:p-4">
        
        {/* Header */}
        <div className="flex flex-row justify-between items-center mb-2 sm:mb-8 border-b-[3px] border-black pb-2 gap-2">
          <h1 className="text-3xl sm:text-5xl font-black text-black tracking-tighter uppercase shrink-0">Traffic Run</h1>
          
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
        
        {/* Controls Header */}
        <div className="flex justify-between items-center mb-4 sm:mb-8 gap-4">
          <button 
            onClick={() => navigate('/single-player')} 
            className="flex-1 bg-[#48cae4] border-[3px] border-black shadow-[4px_4px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-y-[4px] active:translate-x-[4px] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] transition-all text-black font-bold py-2 px-2 sm:px-4 text-sm sm:text-base uppercase cursor-pointer"
          >
            &larr; Back
          </button>
          <button 
            onClick={startNewGame} 
            className="flex-1 bg-[#ffb5a7] border-[3px] border-black shadow-[4px_4px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-y-[4px] active:translate-x-[4px] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] transition-all text-black font-bold py-2 px-2 sm:px-4 text-sm sm:text-base uppercase cursor-pointer"
          >
            {gameStarted ? 'Restart' : 'Start'}
          </button>
        </div>

        {/* Game Container */}
        <div 
          className="bg-gray-700 border-[4px] border-black shadow-[6px_6px_0_0_#000] sm:shadow-[8px_8px_0_0_#000] touch-none select-none relative cursor-grab active:cursor-grabbing mx-auto w-full aspect-[3/4] overflow-hidden"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp} 
        >
          {/* Lane Dividers */}
          <div className="absolute top-0 bottom-0 left-1/3 w-0 border-l-[4px] border-dashed border-white/40"></div>
          <div className="absolute top-0 bottom-0 left-2/3 w-0 border-l-[4px] border-dashed border-white/40"></div>

          {!gameStarted && !gameOver && (
            <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-20 flex items-center justify-center">
               <button 
                  onClick={startNewGame}
                  className="bg-[#06d6a0] border-[4px] border-black shadow-[6px_6px_0_0_#000] text-black font-black py-4 px-8 text-2xl uppercase transition-all hover:scale-105 rotate-2"
                >
                  Start Engine
                </button>
            </div>
          )}

          {gameOver && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center border-[4px] border-black m-[-4px]">
              <div className="bg-[#fcf6bd] border-[4px] border-black shadow-[6px_6px_0_0_#000] p-4 sm:p-6 text-center transform -rotate-2">
                <h2 className="text-3xl sm:text-4xl font-black text-black mb-2 uppercase">CRASH!</h2>
                <p className="font-bold text-lg mb-4">Score: {score}</p>
                <button 
                  onClick={startNewGame}
                  className="bg-[#06d6a0] border-[3px] border-black shadow-[4px_4px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-y-[4px] active:translate-x-[4px] text-black font-bold py-2 px-4 sm:py-3 sm:px-6 text-lg sm:text-xl uppercase transition-all cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
          
          {/* Obstacles */}
          {obstacles.map(ob => (
            <div 
              key={ob.id}
              className="absolute w-1/3 p-2 transition-none"
              style={{ left: `${ob.lane * 33.33}%`, top: `${ob.y}%`, height: '15%' }}
            >
              <div className="w-full h-full bg-[#ef476f] border-[3px] border-black shadow-[3px_3px_0_0_rgba(0,0,0,0.5)] rounded-sm relative">
                 <div className="absolute bottom-1 w-[80%] left-[10%] h-2 bg-black/20"></div> {/* Windshield detail */}
              </div>
            </div>
          ))}

          {/* Player Car */}
          <div 
            className="absolute w-1/3 p-2 bottom-[10%] h-[15%] transition-all duration-150 ease-out z-10"
            style={{ left: `${playerLane * 33.33}%` }}
          >
            <div className="w-full h-full bg-[#06d6a0] border-[3px] border-black shadow-[4px_4px_0_0_#000] rounded-sm relative">
                <div className="absolute top-1 w-[80%] left-[10%] h-3 bg-white/40 border-[2px] border-black"></div> {/* Windshield detail */}
                <div className="absolute -bottom-2 left-1 w-2 h-2 bg-red-500 rounded-full border-[1px] border-black"></div>{/* taillight */}
                <div className="absolute -bottom-2 right-1 w-2 h-2 bg-red-500 rounded-full border-[1px] border-black"></div>{/* taillight */}
            </div>
          </div>
        </div>

        {/* Footer text */}
        <p className="mt-4 mb-8 text-black text-center px-4 font-bold uppercase tracking-wider text-[11px] sm:text-base bg-[#fcf6bd] border-[3px] border-black p-2 sm:p-3 shadow-[4px_4px_0_0_#000] transform rotate-1">
          Use A/D, Left/Right Arrows, or Swipe to dodge!
        </p>

        {/* --- GLOBAL TOP 3 LEADERBOARD --- */}
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
                  <li 
                    key={entry.id || idx} 
                    className={`${bgColor} border-[3px] border-black p-3 sm:p-4 shadow-[4px_4px_0_0_#000] flex justify-between items-center transition-transform hover:-translate-y-1`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <span className="text-lg sm:text-xl font-black bg-white border-[2px] border-black rounded-full w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center shadow-[2px_2px_0_0_#000]">
                        #{idx + 1}
                      </span>
                      <span className="font-black uppercase text-base sm:text-lg tracking-wider">
                        {entry.name}
                      </span>
                    </div>
                    <span className="font-black text-xl sm:text-2xl">
                      {entry.score}
                    </span>
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