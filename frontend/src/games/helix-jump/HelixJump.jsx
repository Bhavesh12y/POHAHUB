import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';

// --- GAME CONSTANTS ---
const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 480;
const GRAVITY = 0.29;
const JUMP_STRENGTH = -5.0;
const BALL_RADIUS = 10;
const PLATFORM_SPACING = 180; 

// --- 3D ENGINE CONSTANTS ---
const R_IN = 50; 
const R_OUT = 115; 
const TILT = 35;  
const PLATFORM_THICKNESS = 18;

export default function HelixJump() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  // -- High Performance Physics State --
  const frameRef = useRef(null);
  const dragRef = useRef({ isDragging: false, lastX: 0, velocity: 0 });
  const lastTimeRef = useRef(0);
  
  const physicsRef = useRef({
    birdY: 100,
    birdV: 0,
    cameraY: 0,
    towerAngle: 0, 
    platforms: [],
    score: 0,
    comboCount: 0,
    isGameOver: false,
    hasStarted: false,
    difficulty: 0
  });

  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [gameStarted, setGameStarted] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [popups, setPopups] = useState([]);
  let popupIdCounter = useRef(0);
  
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [hasSubmittedScore, setHasSubmittedScore] = useState(false);
  
  const playerName = localStorage.getItem('Doozles-player-name') || 'Player';
  const [localHighScore, setLocalHighScore] = useState(() => {
    const saved = localStorage.getItem('helixjump-highScore');
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  useEffect(() => {
    if (score > localHighScore) {
      setLocalHighScore(score);
      localStorage.setItem('helixjump-highScore', score.toString());
    }
  }, [score, localHighScore]);

  useEffect(() => {
    const s = connectSocket();
    const fetchLeaderboard = () => {
      emitWithAck('leaderboard:get', 'helix-jump').then((res) => {
        if (res?.ok) setGlobalLeaderboard(res.leaderboard);
      });
    };
    if (s.connected) fetchLeaderboard();
    else s.on('connect', fetchLeaderboard);
    s.on('leaderboard:update:helix-jump', (newLeaderboard) => setGlobalLeaderboard(newLeaderboard));
    return () => {
      s.off('leaderboard:update:helix-jump');
      s.off('connect', fetchLeaderboard);
    };
  }, []);

  useEffect(() => {
    if (gameOver && !hasSubmittedScore && score > 0) {
      setHasSubmittedScore(true);
      emitWithAck('leaderboard:submit', { gameId: 'helix-jump', name: playerName, score: score });
    }
  }, [gameOver, hasSubmittedScore, score, playerName]);

  const triggerPopup = (text, type = 'normal') => {
    const id = popupIdCounter.current++;
    setPopups(prev => [...prev, { id, text, type }]);
    setTimeout(() => setPopups(prev => prev.filter(p => p.id !== id)), 1000);
  };

  const generatePlatform = (y, difficulty) => {
    let segments = [];
    if (difficulty === 0) {
      segments.push({ start: 0, end: Math.PI * 2, type: 'safe' });
      return { y, segments, broken: false, passed: false };
    }
    let numGaps = 1;
    if (difficulty > 4) numGaps = Math.random() > 0.5 ? 2 : 1;
    let gapSize = Math.max(0.6, 1.2 - (difficulty * 0.04)); 
    let dangerProb = Math.min(0.6, 0.1 + (difficulty * 0.08));

    const sectionArc = (Math.PI * 2) / numGaps;
    for (let i = 0; i < numGaps; i++) {
      let sectionStart = i * sectionArc;
      let sectionEnd = (i + 1) * sectionArc;
      let gapStart = sectionStart + 0.1 + Math.random() * (sectionArc - gapSize - 0.2);
      let gapEnd = gapStart + gapSize;
      
      let solid1 = { start: sectionStart, end: gapStart };
      let solid2 = { start: gapEnd, end: sectionEnd };
      
      const processSolid = (solid) => {
          let width = solid.end - solid.start;
          if (width < 0.1) return; 
          if (Math.random() < dangerProb) {
              let maxDSize = width * 0.4;
              let dSize = Math.max(0.2, Math.min(maxDSize, 0.2 + (difficulty * 0.05))); 
              let padding = 0.15; 
              if (width < dSize + padding * 2) {
                  segments.push({ start: solid.start, end: solid.end, type: 'safe' });
                  return;
              }
              let dStart = solid.start + padding + Math.random() * (width - dSize - padding * 2);
              let dEnd = dStart + dSize;
              segments.push({ start: solid.start, end: dStart, type: 'safe' });
              segments.push({ start: dStart, end: dEnd, type: 'danger' });
              segments.push({ start: dEnd, end: solid.end, type: 'safe' });
          } else {
              segments.push({ start: solid.start, end: solid.end, type: 'safe' });
          }
      };
      processSolid(solid1);
      processSolid(solid2);
    }
    return { y, segments, broken: false, passed: false };
  };

  const resetGame = () => {
    physicsRef.current = {
      birdY: 100, birdV: 0, cameraY: 0, towerAngle: 0,
      platforms: [
        generatePlatform(250, 0),
        generatePlatform(250 + PLATFORM_SPACING, 1),
        generatePlatform(250 + PLATFORM_SPACING * 2, 2)
      ],
      score: 0, comboCount: 0, isGameOver: false, hasStarted: false, difficulty: 0
    };
    dragRef.current = { isDragging: false, lastX: 0, velocity: 0 };
    lastTimeRef.current = 0; // Reset time tracker
    setScore(0);
    setGameOver(false);
    setGameStarted(false);
    setHasSubmittedScore(false);
  };

  const getDrawableChunks = (segments, towerAngle) => {
    let chunks = [];
    segments.forEach(seg => {
      let s = (seg.start + towerAngle) % (Math.PI * 2);
      if (s < 0) s += Math.PI * 2;
      let e = (seg.end + towerAngle) % (Math.PI * 2);
      if (e < 0) e += Math.PI * 2;

      let ranges = [];
      if (s > e) {
        ranges.push({ s: s, e: Math.PI * 2 });
        ranges.push({ s: 0, e: e });
      } else {
        ranges.push({ s: s, e: e });
      }

      ranges.forEach(r => {
        if (r.s < Math.PI && r.e > Math.PI) {
          chunks.push({ start: r.s, end: Math.PI, type: seg.type, isFront: true });
          chunks.push({ start: Math.PI, end: r.e, type: seg.type, isFront: false });
        } else {
          chunks.push({ start: r.s, end: r.e, type: seg.type, isFront: r.s < Math.PI });
        }
      });
    });
    return chunks;
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
    
    if (physicsRef.current.isGameOver) {
      frameRef.current = requestAnimationFrame(gameLoop);
      return; 
    }
    
    const state = physicsRef.current;
    
    // Tower Inertia with frame-independent damping
    if (!dragRef.current.isDragging) {
      dragRef.current.velocity *= Math.pow(0.92, timeScale);
      state.towerAngle += dragRef.current.velocity * timeScale;
    }

    if (state.hasStarted) {
      const prevY = state.birdY;
      
      // Normalized Physics
      state.birdV += GRAVITY * timeScale;
      state.birdY += state.birdV * timeScale;

      const targetCam = state.birdY - 150;
      if (targetCam > state.cameraY) {
        state.cameraY += (targetCam - state.cameraY) * (0.15 * timeScale);
      }

      const lastPlatform = state.platforms[state.platforms.length - 1];
      if (state.cameraY + CANVAS_HEIGHT > lastPlatform.y) {
        state.difficulty++;
        state.platforms.push(generatePlatform(lastPlatform.y + PLATFORM_SPACING, state.difficulty));
      }

      state.platforms.forEach(platform => {
        if (platform.broken) return;

        const hitY = platform.y + TILT;
        
        if (prevY + BALL_RADIUS <= hitY && state.birdY + BALL_RADIUS > hitY && state.birdV > 0) {
          const chunks = getDrawableChunks(platform.segments, state.towerAngle);
          const hitChunk = chunks.find(c => Math.PI / 2 >= c.start && Math.PI / 2 <= c.end);

          if (hitChunk) {
            if (state.comboCount >= 3) {
              platform.broken = true;
              state.birdV = JUMP_STRENGTH;
              triggerPopup('SMASH!', 'combo');
              state.score += state.comboCount * 2;
              setScore(state.score);
              state.comboCount = 0;
              setIsShaking(true); 
              setTimeout(() => setIsShaking(false), 200);
            } else if (hitChunk.type === 'safe') {
              state.birdV = JUMP_STRENGTH;
              state.birdY = hitY - BALL_RADIUS;
              state.comboCount = 0;
            } else if (hitChunk.type === 'danger') {
              state.isGameOver = true;
              setGameOver(true);
            }
          }
        }

        if (state.birdY > platform.y + 40 && !platform.passed && !platform.broken) {
          platform.passed = true;
          state.comboCount++;
          state.score += state.comboCount;
          setScore(state.score);
          if (state.comboCount > 1) {
            triggerPopup(`${state.comboCount}x DROP!`, 'praise');
          }
        }
      });

      if (state.platforms.length > 10) state.platforms.shift();
    } else {
      // Idle Bounce
      state.birdV += GRAVITY * timeScale;
      state.birdY += state.birdV * timeScale;
      if (state.birdY > 250 + TILT - BALL_RADIUS) {
        state.birdV = JUMP_STRENGTH;
        state.birdY = 250 + TILT - BALL_RADIUS;
      }
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      
      const drawChunk = (y, chunk) => {
        const { start, end, type, isFront } = chunk;
        const steps = 15;
        const step = (end - start) / steps;
        const screenY = y - state.cameraY;

        let fill = type === 'safe' ? '#a9def9' : '#ef476f';
        let darkFill = type === 'safe' ? '#48cae4' : '#d63353';
        
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#000';

        ctx.fillStyle = fill;
        ctx.beginPath();
        for(let i=0; i<=steps; i++) ctx.lineTo(160 + R_OUT * Math.cos(start + i * step), screenY + TILT * Math.sin(start + i * step));
        for(let i=steps; i>=0; i--) ctx.lineTo(160 + R_IN * Math.cos(start + i * step), screenY + TILT * Math.sin(start + i * step));
        ctx.closePath(); ctx.fill(); ctx.stroke();

        if (isFront) {
          ctx.fillStyle = darkFill;
          ctx.beginPath();
          for(let i=0; i<=steps; i++) ctx.lineTo(160 + R_OUT * Math.cos(start + i * step), screenY + TILT * Math.sin(start + i * step));
          for(let i=steps; i>=0; i--) ctx.lineTo(160 + R_OUT * Math.cos(start + i * step), screenY + TILT * Math.sin(start + i * step) + PLATFORM_THICKNESS);
          ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      };

      let allChunks = [];
      state.platforms.forEach(p => {
        if (!p.broken && p.y - state.cameraY > -50 && p.y - state.cameraY < CANVAS_HEIGHT + 50) {
          allChunks.push({ y: p.y, chunks: getDrawableChunks(p.segments, state.towerAngle) });
        }
      });

      allChunks.forEach(pc => pc.chunks.filter(c => !c.isFront).forEach(c => drawChunk(pc.y, c)));

      ctx.fillStyle = '#e5e7eb';
      ctx.lineWidth = 3;
      ctx.fillRect(160 - R_IN, 0, R_IN * 2, CANVAS_HEIGHT);
      ctx.beginPath();
      ctx.moveTo(160 - R_IN, 0); ctx.lineTo(160 - R_IN, CANVAS_HEIGHT);
      ctx.moveTo(160 + R_IN, 0); ctx.lineTo(160 + R_IN, CANVAS_HEIGHT);
      ctx.stroke();

      const spinOffset = (state.towerAngle * R_IN) % 40; 
      for(let i=-3; i<=3; i++) {
         let lineX = 160 + spinOffset + i * 40;
         if (lineX > 160 - R_IN + 5 && lineX < 160 + R_IN - 5) {
           ctx.beginPath(); ctx.moveTo(lineX, 0); ctx.lineTo(lineX, CANVAS_HEIGHT); ctx.stroke();
         }
      }

      allChunks.forEach(pc => pc.chunks.filter(c => c.isFront).forEach(c => drawChunk(pc.y, c)));

      const ballScreenY = state.birdY - state.cameraY;
      ctx.fillStyle = '#000';
      ctx.beginPath(); ctx.arc(160 + 4, ballScreenY + 4, BALL_RADIUS, 0, Math.PI*2); ctx.fill(); 
      ctx.fillStyle = (state.comboCount >= 3) ? '#ef476f' : '#ffd166'; 
      ctx.beginPath(); ctx.arc(160, ballScreenY, BALL_RADIUS, 0, Math.PI*2); ctx.fill();
      ctx.stroke();
    }

    frameRef.current = requestAnimationFrame(gameLoop);
  }, []);

  const handlePointerDown = (e) => {
    e.target.setPointerCapture(e.pointerId); 
    if (physicsRef.current.isGameOver) return;
    if (!physicsRef.current.hasStarted) {
      physicsRef.current.hasStarted = true;
      setGameStarted(true);
    }
    // FIX 1: Use dragRef instead of pointerRef
    dragRef.current.isDragging = true;
    dragRef.current.lastX = e.clientX;
  };

  const handlePointerMove = (e) => {
    // FIX 2: Use dragRef instead of pointerRef
    if (!dragRef.current.isDragging || physicsRef.current.isGameOver) return;
    
    // FIX 3: Calculate the delta distance moved since last frame
    const delta = e.clientX - dragRef.current.lastX;
    
    physicsRef.current.towerAngle += delta * 0.015;
    dragRef.current.velocity = delta * 0.015;
    dragRef.current.lastX = e.clientX;
  };

  const handlePointerUp = () => {
    dragRef.current.isDragging = false;
  };

  // FIX 4: Merged the two useEffects and corrected event listener unbinding
  useEffect(() => {
    resetGame();
    frameRef.current = requestAnimationFrame(gameLoop);
    
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);
    
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      cancelAnimationFrame(frameRef.current);
    };
  }, [gameLoop]);

  return (
    <div className="flex flex-col items-center min-h-screen pt-0 pb-10 sm:justify-center">
      <style>{`
        @keyframes floatUp { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-40px) scale(1.2); opacity: 0; } }
        @keyframes boardShake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-6px) rotate(-2deg); } 75% { transform: translateX(6px) rotate(2deg); } }
        .animate-float { animation: floatUp 1s ease-out forwards; }
        .animate-shake { animation: boardShake 0.2s ease-in-out; }
      `}</style>
      <div className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center">
        {popups.map(popup => (
          <div key={popup.id} className="absolute animate-float mt-32">
            <span className={`font-black uppercase text-4xl drop-shadow-[3px_3px_0_#000] ${popup.type === 'combo' ? 'text-[#ef476f]' : 'text-[#06d6a0]'}`}>{popup.text}</span>
          </div>
        ))}
      </div>
      <div className="w-full max-w-[500px] p-2 sm:p-4 relative z-10">
        <div className="flex flex-row justify-between items-center mb-2 sm:mb-8 border-b-[3px] border-black pb-2 sm:pb-4 gap-2">
          <h1 className="text-3xl sm:text-5xl font-black text-black tracking-tighter uppercase shrink-0 leading-none">Helix<br/>Drop</h1>
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
          <button onClick={() => navigate('/')} className="flex-1 bg-[#48cae4] border-[3px] border-black shadow-[4px_4px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-y-[4px] active:translate-x-[4px] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] transition-all text-black font-bold py-2 px-2 sm:px-4 text-sm sm:text-base uppercase cursor-pointer">&larr; Back</button>
        </div>
        <div className={`mx-auto bg-white border-[4px] border-black shadow-[8px_8px_0_0_#000] relative overflow-hidden mb-8 touch-none select-none cursor-grab active:cursor-grabbing ${isShaking ? 'animate-shake' : ''}`} style={{ width: CANVAS_WIDTH, height: CANVAS_HEIGHT }} onPointerDown={handlePointerDown}>
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTAgMjBoMjBWMEgwem0xOS0xdjEtMWgtMXYxLTEtMS0xIiBmaWxsPSJub25lIiBzdHJva2U9IiNlNWU3ZWIiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')] opacity-50 z-0 pointer-events-none" />
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="absolute inset-0 z-10 pointer-events-none" />
          {!gameStarted && !gameOver && (
            <div className="absolute inset-0 flex items-center justify-center z-30 bg-white/30 backdrop-blur-[1px] pointer-events-none">
              <div className="bg-[#fcf6bd] border-[3px] border-black shadow-[4px_4px_0_0_#000] p-4 text-center animate-bounce mt-32"><p className="font-black text-xl uppercase">Drag to Spin!</p></div>
            </div>
          )}
          {gameOver && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center pointer-events-auto">
              <div className="bg-[#ef476f] border-[4px] border-black shadow-[6px_6px_0_0_#000] p-4 sm:p-6 text-center transform -rotate-2">
                <h2 className="text-3xl font-black text-white mb-4 uppercase">Smashed!</h2>
                <button onClick={(e) => { e.stopPropagation(); resetGame(); }} className="bg-[#06d6a0] border-[3px] border-black shadow-[4px_4px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-y-[4px] active:translate-x-[4px] text-black font-bold py-2 px-6 text-xl uppercase transition-all cursor-pointer">Try Again</button>
              </div>
            </div>
          )}
        </div>
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
