import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';

// Added 'size' metadata for fair shape generation
const SHAPES = [
  { id: '1x1', matrix: [[1]], color: 'bg-[#ff99c8]', size: 'small' }, 
  { id: '2x2', matrix: [[1, 1], [1, 1]], color: 'bg-[#a9def9]', size: 'medium' }, 
  { id: '3x3', matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: 'bg-[#fcf6bd]', size: 'large' }, 
  { id: 'h2', matrix: [[1, 1]], color: 'bg-[#d0f4de]', size: 'small' }, 
  { id: 'v2', matrix: [[1], [1]], color: 'bg-[#d0f4de]', size: 'small' }, 
  { id: 'h3', matrix: [[1, 1, 1]], color: 'bg-[#e4c1f9]', size: 'medium' }, 
  { id: 'v3', matrix: [[1], [1], [1]], color: 'bg-[#e4c1f9]', size: 'medium' },
  { id: 'h4', matrix: [[1, 1, 1, 1]], color: 'bg-[#ffb5a7]', size: 'large' }, 
  { id: 'v4', matrix: [[1], [1], [1], [1]], color: 'bg-[#ffb5a7]', size: 'large' },
  { id: 'L-right', matrix: [[1, 0], [1, 0], [1, 1]], color: 'bg-[#ffd166]', size: 'medium' }, 
  { id: 'L-left', matrix: [[0, 1], [0, 1], [1, 1]], color: 'bg-[#06d6a0]', size: 'medium' }, 
  { id: 'T-up', matrix: [[0, 1, 0], [1, 1, 1]], color: 'bg-[#118ab2]', size: 'medium' }, 
];

const GRID_SIZE = 8;

export default function BlockBlaster() {
  const navigate = useNavigate();
  
  // -- Refs for Stale-State Prevention --
  const gridRef = useRef(null);
  const boardRef = useRef(Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null)));
  const shapesRef = useRef([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(1);
  const gameOverRef = useRef(false);

  // -- React State for Rendering --
  const [board, setBoard] = useState(boardRef.current);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [availableShapes, setAvailableShapes] = useState([]);
  const [clearingCells, setClearingCells] = useState([]);
  const [isShaking, setIsShaking] = useState(false);
  const [popups, setPopups] = useState([]);
  let popupIdCounter = useRef(0);
  
  // -- GLOBAL LEADERBOARD STATE --
  const [globalLeaderboard, setGlobalLeaderboard] = useState([]);
  const [hasSubmittedScore, setHasSubmittedScore] = useState(false);
  
  const playerName = localStorage.getItem('pohahub-player-name') || 'Player';
 const [localHighScore, setLocalHighScore] = useState(() => {
    const saved = localStorage.getItem('blockblaster-highScore');
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  // Track personal best locally
  useEffect(() => {
    if (score > localHighScore) {
      setLocalHighScore(score);
      localStorage.setItem('blockblaster-highScore', score.toString());
    }
  }, [score, localHighScore]);

  // -- High Performance Drag State --
  const dragStateRef = useRef({
    isDragging: false,
    shapeIdx: null,
    x: 0, 
    y: 0,
    hoverR: null,
    hoverC: null,
    isValidHover: false
  });
  
  const [dragRender, setDragRender] = useState({
    isDragging: false,
    shapeIdx: null,
    x: 0, 
    y: 0,
    hoverR: null,
    hoverC: null,
    isValidHover: false
  });

  // -- FETCH AND SYNC LEADERBOARD --
  useEffect(() => {
    emitWithAck('leaderboard:get', 'block-blaster').then((res) => {
      if (res?.ok) setGlobalLeaderboard(res.leaderboard);
    });

    const handleLeaderboardUpdate = (newLeaderboard) => {
      setGlobalLeaderboard(newLeaderboard);
    };

    const s = connectSocket();
    s.on('leaderboard:update:block-blaster', handleLeaderboardUpdate);

    return () => {
      s.off('leaderboard:update:block-blaster', handleLeaderboardUpdate);
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      // Cancel the event
      e.preventDefault();
      // Chrome requires returnValue to be set to trigger the prompt
      e.returnValue = ''; 
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    // Cleanup the event listener when the component unmounts
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  // -- SUBMIT SCORE ON GAME OVER --
  useEffect(() => {
    if (gameOver && !hasSubmittedScore && score > 0) {
      setHasSubmittedScore(true);
      emitWithAck('leaderboard:submit', { 
        gameId: 'block-blaster', 
        name: playerName, 
        score: score 
      });
    }
  }, [gameOver, hasSubmittedScore, score, playerName]);

  // -- Helpers --
  const triggerPopup = (text, type = 'normal') => {
    const id = popupIdCounter.current++;
    setPopups(prev => [...prev, { id, text, type }]);
    setTimeout(() => {
      setPopups(prev => prev.filter(p => p.id !== id));
    }, 1000);
  };

  const syncState = (newBoard, newShapes, newScore, newGameOver) => {
    boardRef.current = newBoard;
    shapesRef.current = newShapes;
    scoreRef.current = newScore;
    gameOverRef.current = newGameOver;
    
    setBoard(newBoard);
    setAvailableShapes(newShapes);
    setScore(newScore);
    setGameOver(newGameOver);
  };

  const generateShapes = useCallback(() => {
    const smalls = SHAPES.filter(s => s.size === 'small');
    const mediums = SHAPES.filter(s => s.size === 'medium');
    const larges = SHAPES.filter(s => s.size === 'large');

    let newShapes = [];
    newShapes.push(smalls[Math.floor(Math.random() * smalls.length)]);
    newShapes.push(Math.random() > 0.5 ? mediums[Math.floor(Math.random() * mediums.length)] : larges[Math.floor(Math.random() * larges.length)]);
    newShapes.push(SHAPES[Math.floor(Math.random() * SHAPES.length)]);
    
    newShapes = newShapes.sort(() => Math.random() - 0.5);
    
    return newShapes; 
  }, []);

  const startNewGame = useCallback(() => {
    const emptyBoard = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null));
    comboRef.current = 1;
    setCombo(1);
    setHasSubmittedScore(false); // Reset for new game
    
    const initialShapes = generateShapes();
    syncState(emptyBoard, initialShapes, 0, false);
  }, [generateShapes]);

  useEffect(() => { 
    startNewGame(); 
  }, [startNewGame]);

  // -- Game Logic --
  const canPlaceShape = (currentBoard, shape, startR, startC) => {
    if (startR === null || startC === null) return false;
    for (let r = 0; r < shape.matrix.length; r++) {
      for (let c = 0; c < shape.matrix[0].length; c++) {
        if (shape.matrix[r][c] === 1) {
          if (startR + r < 0 || startR + r >= GRID_SIZE || startC + c < 0 || startC + c >= GRID_SIZE) return false;
          if (currentBoard[startR + r][startC + c] !== null) return false;
        }
      }
    }
    return true;
  };

  const checkGameOver = useCallback((currentBoard, currentShapes) => {
    const remainingShapes = currentShapes.filter(s => s !== null);
    if (remainingShapes.length === 0) return false;

    for (let shape of remainingShapes) {
      for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
          if (canPlaceShape(currentBoard, shape, r, c)) return false; 
        }
      }
    }
    return true; 
  }, []);

  const placeShape = useCallback((r, c, shapeIndex) => {
    const shape = shapesRef.current[shapeIndex];
    if (!canPlaceShape(boardRef.current, shape, r, c)) return;

    let newBoard = boardRef.current.map(row => [...row]);
    let blocksPlaced = 0;
    
    for (let sr = 0; sr < shape.matrix.length; sr++) {
      for (let sc = 0; sc < shape.matrix[0].length; sc++) {
        if (shape.matrix[sr][sc] === 1) {
          newBoard[r + sr][c + sc] = shape.color;
          blocksPlaced++;
        }
      }
    }

    let rowsToClear = [];
    let colsToClear = [];

    for (let i = 0; i < GRID_SIZE; i++) {
      if (newBoard[i].every(cell => cell !== null)) rowsToClear.push(i);
    }
    for (let j = 0; j < GRID_SIZE; j++) {
      let isColFull = true;
      for (let i = 0; i < GRID_SIZE; i++) {
        if (newBoard[i][j] === null) isColFull = false;
      }
      if (isColFull) colsToClear.push(j);
    }

    const totalLines = rowsToClear.length + colsToClear.length;
    let newScore = scoreRef.current + blocksPlaced; 

    if (totalLines > 0) {
      const lineScores = { 1: 10, 2: 25, 3: 45, 4: 70, 5: 100, 6: 150 };
      const baseLineScore = lineScores[Math.min(totalLines, 6)];
      
      const earned = baseLineScore * comboRef.current;
      newScore += earned;

      triggerPopup(`+${earned}`, 'score');
      if (comboRef.current > 1) triggerPopup(`${comboRef.current}x COMBO!`, 'combo');
      if (totalLines >= 3) triggerPopup('AWESOME!', 'praise');

      comboRef.current += 1;
      setCombo(comboRef.current);
      
      let finalBoard = newBoard.map(row => [...row]);
      let clearedIds = [];
      rowsToClear.forEach(rowIndex => {
        for (let col = 0; col < GRID_SIZE; col++) {
          finalBoard[rowIndex][col] = null;
          clearedIds.push(`${rowIndex}-${col}`);
        }
      });
      colsToClear.forEach(colIndex => {
        for (let row = 0; row < GRID_SIZE; row++) {
          finalBoard[row][colIndex] = null;
          clearedIds.push(`${row}-${colIndex}`);
        }
      });

      let finalShapes = [...shapesRef.current];
      finalShapes[shapeIndex] = null;
      
      if (finalShapes.every(s => s === null)) {
        finalShapes = generateShapes(); 
      }
      
      let isOver = checkGameOver(finalBoard, finalShapes);

      shapesRef.current = finalShapes;
      setAvailableShapes(finalShapes);
      scoreRef.current = newScore;
      setScore(newScore);
      gameOverRef.current = isOver;
      setGameOver(isOver);
      
      setClearingCells(clearedIds);
      setIsShaking(true);
      
      setTimeout(() => {
        boardRef.current = finalBoard;
        setBoard(finalBoard);
        setClearingCells([]);
        setIsShaking(false);
      }, 500);

    } else {
      comboRef.current = 1;
      setCombo(1);
      
      let finalShapes = [...shapesRef.current];
      finalShapes[shapeIndex] = null;
      
      if (finalShapes.every(s => s === null)) {
        finalShapes = generateShapes();
      }
      
      let isOver = checkGameOver(newBoard, finalShapes);
      
      syncState(newBoard, finalShapes, newScore, isOver);
    }
  }, [generateShapes, checkGameOver]);

  const handlePointerDown = (e, idx) => {
    if (shapesRef.current[idx] === null || gameOverRef.current || isShaking) return;
    
    dragStateRef.current = {
      isDragging: true,
      shapeIdx: idx,
      x: e.clientX,
      y: e.clientY,
      hoverR: null, hoverC: null,
      isValidHover: false
    };

    setDragRender({ ...dragStateRef.current });
    document.body.style.overflow = 'hidden'; 
  };

  useEffect(() => {
    const handlePointerMove = (e) => {
      if (!dragStateRef.current.isDragging || !gridRef.current) return;
      
      const x = e.clientX;
      const y = e.clientY;
      const gridRect = gridRef.current.getBoundingClientRect();
      const cellW = gridRect.width / GRID_SIZE;
      const cellH = gridRect.height / GRID_SIZE;
      
      const shape = shapesRef.current[dragStateRef.current.shapeIdx];
      const shapeW = shape.matrix[0].length * cellW;
      const shapeH = shape.matrix.length * cellH;

      const isMobile = window.innerWidth < 640;
      const offsetY = isMobile ? 80 : 40;

      const targetX = x - (shapeW / 2);
      const targetY = y - shapeH - offsetY;

      let c = Math.round((targetX - gridRect.left) / cellW);
      let r = Math.round((targetY - gridRect.top) / cellH);

      const margin = 2;
      const isNearGrid = (
        targetX >= gridRect.left - (cellW * margin) && 
        targetX <= gridRect.right + (cellW * margin) && 
        targetY >= gridRect.top - (cellH * margin) && 
        targetY <= gridRect.bottom + (cellH * margin)
      );

      let isValid = false;
      if (isNearGrid) {
        isValid = canPlaceShape(boardRef.current, shape, r, c);
      } else {
        r = null; c = null;
      }

      dragStateRef.current = {
        ...dragStateRef.current,
        x, y, hoverR: r, hoverC: c, isValidHover: isValid
      };
      
      setDragRender({ ...dragStateRef.current });
    };

    const handlePointerUp = () => {
      const state = dragStateRef.current;
      if (state.isDragging) {
        if (state.isValidHover && state.hoverR !== null && state.hoverC !== null) {
          placeShape(state.hoverR, state.hoverC, state.shapeIdx);
        }
        
        dragStateRef.current = { isDragging: false, shapeIdx: null, x: 0, y: 0, hoverR: null, hoverC: null, isValidHover: false };
        setDragRender({ ...dragStateRef.current });
        document.body.style.overflow = '';
      }
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      document.body.style.overflow = '';
    };
  }, [placeShape]);
 
  let predictedClearRows = [];
  let predictedClearCols = [];

  if (dragRender.isDragging && dragRender.isValidHover && dragRender.hoverR !== null && dragRender.hoverC !== null) {
    const shape = availableShapes[dragRender.shapeIdx];
    if (shape) {
      let tempBoard = board.map(row => [...row]);
      let canPredict = true;
      
      for (let sr = 0; sr < shape.matrix.length; sr++) {
        for (let sc = 0; sc < shape.matrix[0].length; sc++) {
          if (shape.matrix[sr][sc] === 1) {
            let tr = dragRender.hoverR + sr;
            let tc = dragRender.hoverC + sc;
            if (tr >= 0 && tr < GRID_SIZE && tc >= 0 && tc < GRID_SIZE) {
              tempBoard[tr][tc] = shape.color; 
            } else {
              canPredict = false;
            }
          }
        }
      }

      if (canPredict) {
        for (let i = 0; i < GRID_SIZE; i++) {
          if (tempBoard[i].every(cell => cell !== null)) predictedClearRows.push(i);
        }
        for (let j = 0; j < GRID_SIZE; j++) {
          let isColFull = true;
          for (let i = 0; i < GRID_SIZE; i++) {
            if (tempBoard[i][j] === null) isColFull = false;
          }
          if (isColFull) predictedClearCols.push(j);
        }
      }
    }
  }


  return (
   <div className="flex flex-col items-center min-h-screen pt-0 pb-10 sm:justify-center">
      <style>{`
        @keyframes floatUp { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-40px) scale(1.2); opacity: 0; } }
        @keyframes boardShake { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-4px) rotate(-1deg); } 75% { transform: translateX(4px) rotate(1deg); } }
        @keyframes blockPopClear {
          0% { transform: scale(1); filter: brightness(1); }
          30% { transform: scale(1.15); filter: brightness(1.4); z-index: 10; box-shadow: 0 0 20px rgba(255,255,255,0.9); border-color: white; }
          100% { transform: scale(0.5) rotate(15deg); opacity: 0; filter: brightness(2); }
        }
        @keyframes smoothGlow {
          0% { box-shadow: inset 0 0 5px rgba(255,255,255,0.2), 0 0 5px rgba(255,255,255,0.1); filter: brightness(1.05); }
          100% { box-shadow: inset 0 0 20px rgba(255,255,255,0.7), 0 0 15px rgba(255,255,255,0.5); filter: brightness(1.25); }
        }
        
        .animate-float { animation: floatUp 1s ease-out forwards; }
        .animate-shake { animation: boardShake 0.2s ease-in-out; }
        .animate-clear-pop { animation: blockPopClear 0.5s cubic-bezier(0.25, 1, 0.5, 1) forwards; }
        .predictive-highlight { 
          animation: smoothGlow 1.5s ease-in-out infinite alternate; 
          border-color: rgba(255, 255, 255, 0.85) !important; 
          z-index: 5; 
        }
      `}</style>

      {dragRender.isDragging && availableShapes[dragRender.shapeIdx] && (
        <div 
          className="fixed pointer-events-none z-50 drop-shadow-[0_15px_15px_rgba(0,0,0,0.4)] transition-transform duration-75 ease-out"
          style={{ 
              left: dragRender.x, 
              top: dragRender.y,
              transform: `translate(-50%, calc(-100% - ${window.innerWidth < 640 ? 80 : 40}px))` 
          }}
        >
          <div className="flex flex-col gap-1 sm:gap-1.5">
            {availableShapes[dragRender.shapeIdx].matrix.map((row, r) => (
              <div key={r} className="flex gap-1 sm:gap-1.5">
                {row.map((val, c) => {
                  if (!val) return <div key={c} className="w-[10vw] h-[10vw] max-w-[40px] max-h-[40px] sm:w-12 sm:h-12 bg-transparent" />;
                  
                  let bgStyle = `${availableShapes[dragRender.shapeIdx].color} border-[2px] sm:border-[3px] border-black shadow-[2px_2px_0_0_#000]`;
                  if (dragRender.hoverR !== null && !dragRender.isValidHover) {
                     bgStyle = 'bg-red-500 border-[2px] sm:border-[3px] border-black opacity-80'; 
                  }
                  return <div key={c} className={`w-[10vw] h-[10vw] max-w-[40px] max-h-[40px] sm:w-12 sm:h-12 transition-colors ${bgStyle}`} />;
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Floating Popups */}
      <div className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center">
        {popups.map(popup => (
          <div key={popup.id} className="absolute animate-float">
            <span className={`font-black uppercase text-3xl drop-shadow-[2px_2px_0_#000] 
              ${popup.type === 'combo' ? 'text-[#ffd166]' : popup.type === 'praise' ? 'text-[#06d6a0]' : 'text-[#ff99c8]'}`}>
              {popup.text}
            </span>
          </div>
        ))}
      </div>

      <div className="w-full max-w-[500px] p-2 sm:p-4 relative z-10">
        
        {/* Header */}
        <div className="flex flex-row justify-between items-center mb-2 sm:mb-8 border-b-[3px] border-black pb-2 sm:pb-4 gap-2">
          <h1 className="text-3xl sm:text-5xl font-black text-black tracking-tighter uppercase shrink-0 leading-none">
            Block<br/>Blaster
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
        
        {/* Controls */}
        <div className="flex justify-between items-center mb-2 sm:mb-6 gap-4">
          <button 
            onClick={() => navigate('/')} 
            className="flex-1 bg-[#48cae4] border-[3px] border-black shadow-[4px_4px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-y-[4px] active:translate-x-[4px] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] transition-all text-black font-bold py-2 px-2 sm:px-4 text-sm sm:text-base uppercase cursor-pointer"
          >
            &larr; Back
          </button>
          
          <div className="bg-white border-[3px] border-black shadow-[4px_4px_0_0_#000] font-bold py-2 px-4 text-sm sm:text-base uppercase text-center flex-1">
            Combo: {combo}x
          </div>
        </div>

        {/* Game Grid Container */}
        <div className={`bg-white border-[4px] border-black shadow-[6px_6px_0_0_#000] sm:shadow-[8px_8px_0_0_#000] p-1 sm:p-4 relative mx-auto w-fit max-w-full mb-3 sm:mb-6 ${isShaking ? 'animate-shake' : ''}`}>
          
          {gameOver && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center border-[4px] border-black m-[-4px]">
              <div className="bg-[#ef476f] border-[4px] border-black shadow-[6px_6px_0_0_#000] p-4 sm:p-6 text-center transform -rotate-2">
                <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 uppercase">Game Over!</h2>
                <button 
                  onClick={startNewGame}
                  className="bg-[#06d6a0] border-[3px] border-black shadow-[4px_4px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-y-[4px] active:translate-x-[4px] text-black font-bold py-2 px-4 sm:py-3 sm:px-6 text-lg sm:text-xl uppercase transition-all cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
          
          <div ref={gridRef} className="grid grid-cols-8 gap-1 sm:gap-1.5 touch-none relative">
            {board.map((row, rIdx) => 
              row.map((cellColor, cIdx) => {
                let isGhostValid = false;
                let isGhostInvalid = false;
                let ghostColor = '';

                if (dragRender.isDragging && dragRender.hoverR !== null && dragRender.hoverC !== null) {
                  const shape = availableShapes[dragRender.shapeIdx];
                  if (shape) {
                    const sr = rIdx - dragRender.hoverR;
                    const sc = cIdx - dragRender.hoverC;
                    if (sr >= 0 && sr < shape.matrix.length && sc >= 0 && sc < shape.matrix[0].length && shape.matrix[sr][sc] === 1) {
                      ghostColor = shape.color;
                      if (dragRender.isValidHover) isGhostValid = true;
                      else isGhostInvalid = true;
                    }
                  }
                }

                const isClearing = clearingCells.includes(`${rIdx}-${cIdx}`);
                const isPredictedToClear = predictedClearRows.includes(rIdx) || predictedClearCols.includes(cIdx);

                return (
                  <div 
                    key={`${rIdx}-${cIdx}`} 
                    className={`w-[10vw] h-[10vw] max-w-[40px] max-h-[40px] sm:w-12 sm:h-12 transition-all duration-75 ease-in-out relative
                      ${cellColor 
                        ? `${cellColor} border-[2px] sm:border-[3px] border-black shadow-[2px_2px_0_0_#000]` 
                        : isGhostValid
                          ? `${ghostColor} opacity-50 border-[2px] sm:border-[3px] border-black border-dashed`
                        : isGhostInvalid
                          ? 'bg-red-500 opacity-30 border-[2px] sm:border-[3px] border-red-900 border-dashed'
                          : 'bg-transparent border-[2px] border-dashed border-black/10'
                      }
                      ${isClearing ? 'animate-clear-pop origin-center' : 'scale-100 opacity-100'}
                      ${isPredictedToClear && !isClearing ? 'predictive-highlight' : ''}
                    `}
                  />
                )
              })
            )}
          </div>
        </div>

        {/* Block Dock */}
        <div className="flex justify-around items-center bg-[#fcf6bd] border-[3px] border-black p-2 sm:p-4 shadow-[4px_4px_0_0_#000] h-[110px] sm:min-h-[140px] mb-8">
          {availableShapes.map((shape, idx) => (
            <div 
              key={idx} 
              className="flex items-center justify-center w-[80px] h-[80px] touch-none"
            >
              {shape !== null && (
                <div 
                  onPointerDown={(e) => handlePointerDown(e, idx)}
                  className={`transition-all duration-200 cursor-grab active:cursor-grabbing
                    ${dragRender.isDragging && dragRender.shapeIdx === idx ? 'opacity-20 scale-90' : 'hover:scale-110'}
                  `}
                >
                  <div className="flex flex-col gap-1 sm:gap-1.5 pointer-events-none">
                    {shape.matrix.map((row, r) => (
                      <div key={r} className="flex gap-1 sm:gap-1.5">
                        {row.map((val, c) => (
                          <div 
                            key={c} 
                            className={`w-5 h-5 sm:w-6 sm:h-6 transition-all ${val ? `${shape.color} border-[2px] border-black shadow-[2px_2px_0_0_#000]` : 'bg-transparent'}`} 
                          />
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

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