import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';

// Helper to pick a random car color (Doozles Palette)
const carColors = ['#ef476f', '#118ab2', '#ffd166', '#f78c6b', '#9b5de5', '#ff99c8'];
const randomCarColor = () => carColors[Math.floor(Math.random() * carColors.length)];
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
const rid = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

// --- High Polish Arcade Vehicle and Obstacle Components ---
function Vehicle({ color, isPlayer, isTruck }) {
  return (
    <div className="w-full h-full flex items-center justify-center py-[2%] select-none">
      <div
        className={`relative w-[60%] sm:w-[54%] ${isTruck ? 'h-full' : 'h-[88%]'} border-[3px] border-black shadow-[4px_4px_0_0_#000] rounded-xl transition-transform overflow-hidden`}
        style={{ backgroundColor: color }}
      >
        {/* Underbody Shadow / Depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/20 via-transparent to-black/30 pointer-events-none" />

        {/* Headlight beams (Only on top edge) */}
        <div className="absolute -top-[3px] left-[10%] w-3 h-3 bg-yellow-300 border-[2px] border-black rounded-t-sm shadow-[0_0_8px_#fde047]" />
        <div className="absolute -top-[3px] right-[10%] w-3 h-3 bg-yellow-300 border-[2px] border-black rounded-t-sm shadow-[0_0_8px_#fde047]" />

        {/* Front Windshield */}
        <div className="absolute top-[14%] left-[12%] right-[12%] h-[22%] bg-gradient-to-b from-sky-200 to-sky-400 border-[2px] border-black rounded-md shadow-inner flex items-center justify-center">
          <div className="w-[80%] h-[2px] bg-white/70 rounded-full" />
        </div>

        {/* Roof scoop / details */}
        {!isTruck && (
          <div className="absolute top-[40%] left-[25%] right-[25%] h-[15%] bg-black/15 border border-black/30 rounded-sm" />
        )}

        {/* Rear Window (Cars) */}
        {!isTruck && (
          <div className="absolute bottom-[16%] left-[16%] right-[16%] h-[16%] bg-gradient-to-t from-slate-900 to-slate-700 border-[2px] border-black rounded-md" />
        )}

        {/* Spoiler Wing (Player & Fast Cars) */}
        {!isTruck && (
          <div className="absolute -bottom-[2px] left-[10%] right-[10%] h-[6px] bg-black border border-black rounded-sm shadow-[0_2px_0_#000]" />
        )}

        {/* Truck Cargo Body */}
        {isTruck && (
          <div className="absolute top-[40%] bottom-[8%] left-[8%] right-[8%] bg-gradient-to-b from-slate-100 to-slate-300 border-[2px] border-black rounded-sm flex flex-col justify-evenly p-1">
            <div className="w-full h-[3px] bg-black/20 rounded-full" />
            <div className="w-full h-[3px] bg-black/20 rounded-full" />
            <div className="w-full h-[3px] bg-black/20 rounded-full" />
            <div className="text-[8px] font-black text-center text-black/50 uppercase tracking-widest leading-none">CARGO</div>
          </div>
        )}

        {/* Taillights */}
        <div className="absolute -bottom-[2px] left-[12%] w-3 h-2 bg-red-600 border-[2px] border-black rounded-b-sm shadow-[0_0_6px_#ef4444]" />
        <div className="absolute -bottom-[2px] right-[12%] w-3 h-2 bg-red-600 border-[2px] border-black rounded-b-sm shadow-[0_0_6px_#ef4444]" />

        {/* Player Dual Racing Stripes */}
        {isPlayer && (
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex gap-1 pointer-events-none">
            <div className="w-1 sm:w-1.5 bg-white/90 shadow-sm" />
            <div className="w-1 sm:w-1.5 bg-white/90 shadow-sm" />
          </div>
        )}

        {/* Side Mirrors */}
        <div className="absolute top-[22%] -left-[4px] w-2 h-2.5 bg-black rounded-l-sm" />
        <div className="absolute top-[22%] -right-[4px] w-2 h-2.5 bg-black rounded-r-sm" />
      </div>
    </div>
  );
}

function Cone() {
  return (
    <div className="w-full h-full flex items-center justify-center p-[8%] select-none">
      <div className="relative w-[50%] h-[75%] flex flex-col items-center justify-end">
        {/* Cone Body */}
        <div className="w-[70%] h-[80%] bg-gradient-to-t from-[#ea580c] to-[#f97316] border-[3px] border-black shadow-[3px_3px_0_0_#000] rounded-t-full relative overflow-hidden flex flex-col justify-center items-center">
          {/* Reflective Stripes */}
          <div className="w-full h-[22%] bg-white border-y-[2px] border-black shadow-inner my-0.5" />
          <div className="w-full h-[18%] bg-white border-y-[2px] border-black shadow-inner" />
        </div>
        {/* Heavy Rubber Base */}
        <div className="w-full h-[18%] bg-[#1f2937] border-[3px] border-black shadow-[3px_3px_0_0_#000] rounded-md -mt-1" />
      </div>
    </div>
  );
}

function Barrier() {
  return (
    <div className="w-full h-full flex items-center justify-center p-[4%] select-none">
      <div className="w-[90%] h-[55%] bg-[#facc15] border-[3px] border-black shadow-[4px_4px_0_0_#000] rounded-md relative overflow-hidden flex flex-col justify-between p-1">
        {/* Warning Hazard Pattern */}
        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,#000_0px,#000_12px,#facc15_12px,#facc15_24px)] opacity-90" />
        {/* Warning Light on Top */}
        <div className="relative z-10 flex justify-between px-2 -mt-2">
          <div className="w-3 h-3 bg-amber-400 border-[2px] border-black rounded-full shadow-[0_0_8px_#f59e0b] animate-ping" />
          <div className="w-3 h-3 bg-amber-400 border-[2px] border-black rounded-full shadow-[0_0_8px_#f59e0b] animate-ping" />
        </div>
        {/* Bottom Stand Feet */}
        <div className="relative z-10 flex justify-between px-2 -mb-2">
          <div className="w-3 h-2 bg-black rounded-b" />
          <div className="w-3 h-2 bg-black rounded-b" />
        </div>
      </div>
    </div>
  );
}

function Obstacle({ obstacle }) {
  switch (obstacle.type) {
    case 'barrier': return <Barrier />;
    case 'cone': return <Cone />;
    case 'truck': return <Vehicle color={obstacle.color} isTruck={true} />;
    default: return <Vehicle color={obstacle.color} isTruck={false} />;
  }
}


// --- Main Game Component ---
export default function TrafficRun() {
  const navigate = useNavigate();

  // Game State
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
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

  // Refs for animation loop
  const requestRef = useRef();
  const speedRef = useRef(2.5); 
  const spawnTimerRef = useRef(0);
  const gameStartTime = useRef(null);
  const lastFrameTimeRef = useRef(null);
  const stateRef = useRef({ playerLane: 1, obstacles: [], score: 0, gameOver: false, gameStarted: false });

  // Swipe state
  const [dragStart, setDragStart] = useState(null);
  const minSwipeDistance = 25; 

  useEffect(() => {
    stateRef.current = { playerLane, obstacles, score, gameOver, gameStarted };
  }, [playerLane, obstacles, score, gameOver, gameStarted]);

  useEffect(() => {
    if (score > localHighScore) {
      setLocalHighScore(score);
      localStorage.setItem('trafficrun-highScore', score.toString());
    }
  }, [score, localHighScore]);

  useEffect(() => {
    const s = connectSocket();
    const fetchLeaderboard = () => {
      emitWithAck('leaderboard:get', 'traffic-run').then((res) => {
        if (res?.ok) setGlobalLeaderboard(res.leaderboard);
      });
    };

    const handleLeaderboardUpdate = (newLeaderboard) => setGlobalLeaderboard(newLeaderboard);

    s.on('leaderboard:update:traffic-run', handleLeaderboardUpdate);
    if (s.connected) fetchLeaderboard();
    else s.on('connect', fetchLeaderboard);

    return () => {
      s.off('leaderboard:update:traffic-run', handleLeaderboardUpdate);
      s.off('connect', fetchLeaderboard);
    };
  }, []);

  useEffect(() => {
    if (gameOver && !hasSubmittedScore && score > 0) {
      setHasSubmittedScore(true);
      emitWithAck('leaderboard:submit', { gameId: 'traffic-run', name: playerName, score: score });
    }
  }, [gameOver, hasSubmittedScore, score, playerName]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (gameStarted && !gameOver) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [gameStarted, gameOver]);

  // --- GAME ENGINE ---
  const updateGame = useCallback((timestamp) => {
    if (!stateRef.current.gameStarted || stateRef.current.gameOver) return;
    if (!gameStartTime.current) return;

    if (lastFrameTimeRef.current == null) lastFrameTimeRef.current = timestamp;
    const deltaMs = timestamp - lastFrameTimeRef.current;
    lastFrameTimeRef.current = timestamp;
    const frameFactor = Math.min(3, deltaMs / (1000 / 60));

    // Fast Leveling: Level up every 8 seconds
    const elapsedSec = (Date.now() - gameStartTime.current) / 1000;
    const diffLevel = Math.min(15, Math.floor(elapsedSec / 8) + 1); 
    
    // Speed scales aggressively
    const maxSpeed = 4.0 + diffLevel * 0.5; 
    const spawnThreshold = Math.max(12, 45 - diffLevel * 2); 

    setLevel((prev) => (prev !== diffLevel ? diffLevel : prev));

    let currentObs = [...stateRef.current.obstacles];
    let newScore = stateRef.current.score;
    let hit = false;

    // Move everything down
    currentObs = currentObs.map((ob) => ({
      ...ob,
      y: ob.y + speedRef.current * frameFactor,
    }));

    // --- ACCURATE COLLISION DETECTION ---
    // Player visual bounds: Starts at ~74%, Ends at ~87%
    const playerHitboxTop = 75; 
    const playerHitboxBottom = 86;

    currentObs.forEach((ob) => {
      // Trim a few percent off the obstacle to make swiping feel fair
      const obHitboxTop = ob.y + 2; 
      const obHitboxBottom = (ob.y + ob.height) - 2;

      const overlapping = 
        ob.lane === stateRef.current.playerLane && 
        obHitboxBottom > playerHitboxTop && 
        obHitboxTop < playerHitboxBottom;

      if (overlapping) hit = true;
    });

    if (hit) {
      setGameOver(true);
      return;
    }

    // Score points for passed obstacles
    const passedObs = currentObs.filter((ob) => ob.y > 100);
    if (passedObs.length > 0) {
      newScore += passedObs.length * 10;
      speedRef.current += passedObs.length * 0.03; // accelerate per dodge
      speedRef.current = Math.min(speedRef.current, maxSpeed);
    }
    
    if (newScore !== stateRef.current.score) setScore(newScore);
    currentObs = currentObs.filter((ob) => ob.y <= 100);

    // Spawning logic (No Coins)
    spawnTimerRef.current += frameFactor;
    if (spawnTimerRef.current > spawnThreshold) {
      spawnTimerRef.current = 0;

      const barrierProb = diffLevel >= 3 ? Math.min(0.4, 0.1 + (diffLevel - 3) * 0.05) : 0;
      const truckProb = diffLevel >= 2 ? 0.25 : 0;
      let barrierLane = -1;
      let extraCars = 0;
      let useTruck = false;

      if (Math.random() < barrierProb) {
        barrierLane = Math.floor(Math.random() * 3);
        if (Math.random() < 0.6) extraCars = 1;
      } else {
        extraCars = diffLevel < 2 ? 1 : Math.random() < 0.4 ? 2 : 1;
        useTruck = Math.random() < truckProb;
      }

      if (barrierLane >= 0) {
        currentObs.push({ id: rid(), lane: barrierLane, y: -20, type: 'barrier', height: 18 });
        if (extraCars > 0) {
          const otherLanes = [0, 1, 2].filter((l) => l !== barrierLane);
          shuffle(otherLanes).slice(0, extraCars).forEach((l) => {
            const isCone = diffLevel >= 2 && Math.random() < 0.3;
            currentObs.push(isCone 
              ? { id: rid(), lane: l, y: -20, type: 'cone', height: 12 }
              : { id: rid(), lane: l, y: -20, type: 'car', height: 18, color: randomCarColor() });
          });
        }
      } else {
        const lanes = shuffle([0, 1, 2]).slice(0, extraCars);
        lanes.forEach((l, idx) => {
          if (useTruck && idx === 0) {
            currentObs.push({ id: rid(), lane: l, y: -28, type: 'truck', height: 26, color: randomCarColor() });
          } else {
            const isCone = diffLevel >= 2 && Math.random() < 0.2;
            currentObs.push(isCone
              ? { id: rid(), lane: l, y: -20, type: 'cone', height: 12 }
              : { id: rid(), lane: l, y: -20, type: 'car', height: 18, color: randomCarColor() });
          }
        });
      }
    }

    setObstacles(currentObs);
    requestRef.current = requestAnimationFrame(updateGame);
  }, []);

  useEffect(() => {
    if (gameStarted && !gameOver) {
      lastFrameTimeRef.current = null;
      requestRef.current = requestAnimationFrame(updateGame);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [gameStarted, gameOver, updateGame]);

  const moveLeft = useCallback(() => setPlayerLane((prev) => Math.max(0, prev - 1)), []);
  const moveRight = useCallback(() => setPlayerLane((prev) => Math.min(2, prev + 1)), []);

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
    setDragStart({ x: e.clientX, y: e.clientY, time: Date.now() });
  };

  const handlePointerUp = (e) => {
    e.target.releasePointerCapture(e.pointerId);
    if (!dragStart) return;

    const distanceX = dragStart.x - e.clientX;
    const distanceY = dragStart.y - e.clientY;
    const isSwipe = Math.abs(distanceX) > minSwipeDistance;
    const totalDist = Math.hypot(distanceX, distanceY);

    if (isSwipe) {
      if (distanceX > minSwipeDistance) moveLeft();
      if (distanceX < -minSwipeDistance) moveRight();
    } else if (totalDist < 15) {
      // Tap on specific lane (0: left, 1: center, 2: right)
      const rect = e.currentTarget.getBoundingClientRect();
      const tapX = e.clientX - rect.left;
      const targetLane = Math.max(0, Math.min(2, Math.floor((tapX / rect.width) * 3)));
      setPlayerLane(targetLane);
    }

    setDragStart(null);
  };


  const startNewGame = () => {
    setObstacles([]);
    setScore(0);
    setLevel(1);
    setPlayerLane(1);
    setGameOver(false);
    setHasSubmittedScore(false);
    speedRef.current = 2.5; 
    spawnTimerRef.current = 0;
    lastFrameTimeRef.current = null;
    gameStartTime.current = Date.now();
    setGameStarted(true);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-[var(--font-family,'Comic_Sans_MS',cursive)] bg-transparent overflow-hidden py-6 sm:py-10">
      <style>{`
        @keyframes roadDash {
          from { background-position-y: 0px; }
          to { background-position-y: 80px; }
        }
        @keyframes curbDash {
          from { background-position-y: 0px; }
          to { background-position-y: 40px; }
        }
        .road-lane-divider {
          background-image: repeating-linear-gradient(to bottom, #fde047 0 35px, transparent 35px 75px);
          animation: roadDash 0.2s linear infinite;
        }
        .road-curb {
          background-image: repeating-linear-gradient(to bottom, #ef4444 0 20px, #ffffff 20px 40px);
          animation: curbDash 0.15s linear infinite;
        }
        .road-lane-divider.paused, .road-curb.paused {
          animation-play-state: paused;
        }
      `}</style>
      <div className="w-full max-w-[500px] sm:max-w-[580px] md:max-w-[660px] p-2 sm:p-4">
        {/* Header */}
        <div className="flex flex-row justify-between items-center mb-2 sm:mb-8 border-b-[3px] border-black pb-2 gap-2">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black text-black tracking-tighter uppercase shrink-0">Traffic Run</h1>
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
        <div className="flex justify-between items-center mb-2 sm:mb-4 gap-4">
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
            {gameStarted ? 'Restart' : 'Start Engine'}
          </button>
        </div>

        {/* Level indicator */}
        <div className="flex justify-center mb-3 sm:mb-6">
          <div className="bg-[#caffbf] border-[3px] border-black shadow-[3px_3px_0_0_#000] px-4 py-1 text-black text-center inline-block -rotate-1">
            <span className="text-[10px] sm:text-sm uppercase font-bold tracking-wider mr-2">Speed Level</span>
            <span className="text-base sm:text-xl font-black">{level}</span>
          </div>
        </div>

        {/* Game Canvas */}
        <div
          className="bg-[#334155] border-[4px] border-black shadow-[6px_6px_0_0_#000] sm:shadow-[8px_8px_0_0_#000] touch-none select-none relative cursor-grab active:cursor-grabbing mx-auto w-full aspect-[3/4] overflow-hidden rounded-lg"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Red/White Track Curbs on Edges */}
          <div className={`road-curb absolute top-0 bottom-0 left-0 w-3 border-r-2 border-black z-10 ${gameStarted && !gameOver ? '' : 'paused'}`} />
          <div className={`road-curb absolute top-0 bottom-0 right-0 w-3 border-l-2 border-black z-10 ${gameStarted && !gameOver ? '' : 'paused'}`} />

          {/* Lane dividers */}
          <div className={`road-lane-divider absolute top-0 bottom-0 left-1/3 w-[5px] -translate-x-1/2 ${gameStarted && !gameOver ? '' : 'paused'}`} />
          <div className={`road-lane-divider absolute top-0 bottom-0 left-2/3 w-[5px] -translate-x-1/2 ${gameStarted && !gameOver ? '' : 'paused'}`} />

          {!gameStarted && !gameOver && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-4">
              <button
                onClick={startNewGame}
                className="bg-[#06d6a0] border-[4px] border-black shadow-[6px_6px_0_0_#000] text-black font-black py-4 px-8 text-2xl uppercase transition-all hover:scale-105 rotate-2"
              >
                🏁 Start Engine!
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
          {obstacles.map((ob) => (
            <div
              key={ob.id}
              className="absolute transition-none"
              style={{
                left: `${ob.lane * 33.33}%`,
                top: `${ob.y}%`,
                width: '33.33%',
                height: `${ob.height}%`,
              }}
            >
              <Obstacle obstacle={ob} />
            </div>
          ))}

          {/* Player Car */}
          <div
            className="absolute bottom-[10%] transition-all duration-150 ease-out z-10"
            style={{ left: `${playerLane * 33.33}%`, width: '33.33%', height: '18%' }}
          >
            <Vehicle color="#06d6a0" isPlayer={true} isTruck={false} />
          </div>
        </div>

        {/* Footer */}
        <p className="mt-4 mb-8 text-black text-center px-4 font-bold uppercase tracking-wider text-[11px] sm:text-base bg-[#fcf6bd] border-[3px] border-black p-2 sm:p-3 shadow-[4px_4px_0_0_#000] transform rotate-1">
          A/D, Arrows, or Swipe! Dodge cars, trucks & barriers!
        </p>

        {/* Global Leaderboard */}
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