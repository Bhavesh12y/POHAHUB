import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Pre-defined block shapes and their specific theme colors
const SHAPES = [
  { id: '1x1', matrix: [[1]], color: 'bg-[#ff99c8]' }, // Pink
  { id: '2x2', matrix: [[1, 1], [1, 1]], color: 'bg-[#a9def9]' }, // Blue
  { id: '3x3', matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: 'bg-[#fcf6bd]' }, // Yellow
  { id: 'h2', matrix: [[1, 1]], color: 'bg-[#d0f4de]' }, // Light Green
  { id: 'v2', matrix: [[1], [1]], color: 'bg-[#d0f4de]' }, 
  { id: 'h3', matrix: [[1, 1, 1]], color: 'bg-[#e4c1f9]' }, // Purple
  { id: 'v3', matrix: [[1], [1], [1]], color: 'bg-[#e4c1f9]' },
  { id: 'h4', matrix: [[1, 1, 1, 1]], color: 'bg-[#ffb5a7]' }, // Peach
  { id: 'v4', matrix: [[1], [1], [1], [1]], color: 'bg-[#ffb5a7]' },
  { id: 'L-right', matrix: [[1, 0], [1, 0], [1, 1]], color: 'bg-[#ffd166]' }, // Orange
  { id: 'L-left', matrix: [[0, 1], [0, 1], [1, 1]], color: 'bg-[#06d6a0]' }, // Dark Green
  { id: 'T-up', matrix: [[0, 1, 0], [1, 1, 1]], color: 'bg-[#118ab2]' }, // Dark Blue
];

const GRID_SIZE = 8;

export default function BlockBlaster() {
  const navigate = useNavigate();
  
  const [board, setBoard] = useState(Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null)));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [availableShapes, setAvailableShapes] = useState([]);
  
  // Custom Drag State
  const [dragState, setDragState] = useState({
    isDragging: false,
    shapeIdx: null,
    x: 0,
    y: 0,
    hoverR: null,
    hoverC: null
  });

  // Initialize High Score from localStorage
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('blockblaster-highScore');
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  // Update High Score
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('blockblaster-highScore', score.toString());
    }
  }, [score, highScore]);

  // Generate 3 random shapes
  const generateShapes = useCallback(() => {
    const newShapes = Array(3).fill(null).map(() => {
      const randomIdx = Math.floor(Math.random() * SHAPES.length);
      return SHAPES[randomIdx];
    });
    setAvailableShapes(newShapes);
  }, []);

  useEffect(() => {
    startNewGame();
  }, [generateShapes]);

  const startNewGame = () => {
    setBoard(Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(null)));
    setScore(0);
    setGameOver(false);
    generateShapes();
  };

  const canPlaceShape = (currentBoard, shape, startR, startC) => {
    for (let r = 0; r < shape.matrix.length; r++) {
      for (let c = 0; c < shape.matrix[0].length; c++) {
        if (shape.matrix[r][c] === 1) {
          // Check out of bounds
          if (startR + r >= GRID_SIZE || startC + c >= GRID_SIZE) return false;
          // Check collision
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
          if (canPlaceShape(currentBoard, shape, r, c)) {
            return false; 
          }
        }
      }
    }
    return true; 
  }, []);

  // --- Core Placement Logic ---
  const placeShape = useCallback((r, c, shapeIndex) => {
    const shape = availableShapes[shapeIndex];
    if (!canPlaceShape(board, shape, r, c)) return;

    let newBoard = board.map(row => [...row]);
    let blocksPlaced = 0;
    
    // 1. Place the shape
    for (let sr = 0; sr < shape.matrix.length; sr++) {
      for (let sc = 0; sc < shape.matrix[0].length; sc++) {
        if (shape.matrix[sr][sc] === 1) {
          newBoard[r + sr][c + sc] = shape.color;
          blocksPlaced++;
        }
      }
    }

    // 2. Check for completed rows/cols
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

    // 3. Clear lines and calculate score
    let scoreGained = blocksPlaced; 
    
    rowsToClear.forEach(rowIndex => {
      for (let col = 0; col < GRID_SIZE; col++) newBoard[rowIndex][col] = null;
      scoreGained += 10; 
    });
    
    colsToClear.forEach(colIndex => {
      for (let row = 0; row < GRID_SIZE; row++) newBoard[row][colIndex] = null;
      scoreGained += 10; 
    });

    if (rowsToClear.length + colsToClear.length > 1) {
      scoreGained += (rowsToClear.length + colsToClear.length) * 5; 
    }

    setBoard(newBoard);
    setScore(prev => prev + scoreGained);

    // 4. Update available shapes & check game state
    const newShapes = [...availableShapes];
    newShapes[shapeIndex] = null;
    setAvailableShapes(newShapes);

    if (newShapes.every(s => s === null)) {
      generateShapes();
    } else if (checkGameOver(newBoard, newShapes)) {
      setGameOver(true);
    }
  }, [availableShapes, board, checkGameOver, generateShapes]);

  // Check Game Over explicitly when new shapes are generated
  useEffect(() => {
    if (!gameOver && availableShapes.some(s => s !== null)) {
      if (checkGameOver(board, availableShapes)) {
        setGameOver(true);
      }
    }
  }, [availableShapes, board, gameOver, checkGameOver]);

  // --- Drag and Drop Logic ---
  const handleDragStart = (e, idx) => {
    if (availableShapes[idx] === null || gameOver) return;
    
    setDragState({
      isDragging: true,
      shapeIdx: idx,
      x: e.clientX,
      y: e.clientY,
      hoverR: null,
      hoverC: null
    });
  };

  useEffect(() => {
    // Prevent mobile scrolling while dragging
    if (dragState.isDragging) {
      document.body.style.overflow = 'hidden';
      document.body.style.touchAction = 'none';
    } else {
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    }

    if (!dragState.isDragging) return;

    const handlePointerMove = (e) => {
      // Find which grid cell we are hovering over using data attributes
      const el = document.elementFromPoint(e.clientX, e.clientY);
      let newHoverR = null;
      let newHoverC = null;

      if (el && el.dataset.row !== undefined) {
        const r = parseInt(el.dataset.row, 10);
        const c = parseInt(el.dataset.col, 10);
        if (canPlaceShape(board, availableShapes[dragState.shapeIdx], r, c)) {
          newHoverR = r;
          newHoverC = c;
        }
      }

      setDragState(prev => ({
        ...prev,
        x: e.clientX,
        y: e.clientY,
        hoverR: newHoverR,
        hoverC: newHoverC
      }));
    };

    const handlePointerUp = () => {
      if (dragState.hoverR !== null && dragState.hoverC !== null) {
        placeShape(dragState.hoverR, dragState.hoverC, dragState.shapeIdx);
      }
      setDragState({ isDragging: false, shapeIdx: null, x: 0, y: 0, hoverR: null, hoverC: null });
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: false });
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerUp);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
    };
  }, [dragState.isDragging, dragState.shapeIdx, dragState.hoverR, dragState.hoverC, board, availableShapes, placeShape]);


  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-[var(--font-family,'Comic_Sans_MS',cursive)] bg-transparent overflow-hidden select-none">
      
      {/* Floating Dragged Element */}
      {dragState.isDragging && availableShapes[dragState.shapeIdx] && (
        <div 
          className="fixed pointer-events-none z-50 drop-shadow-[0_15px_15px_rgba(0,0,0,0.4)]"
          style={{ 
            left: dragState.x, 
            top: dragState.y,
            // Offset heavily upward on mobile so the user's finger doesn't block the grid view
            transform: 'translate(-50%, -130%)' 
          }}
        >
          <div className="flex flex-col gap-1 sm:gap-1.5">
            {availableShapes[dragState.shapeIdx].matrix.map((row, r) => (
              <div key={r} className="flex gap-1 sm:gap-1.5">
                {row.map((val, c) => (
                  <div 
                    key={c} 
                    className={`w-8 h-8 sm:w-12 sm:h-12 ${val ? `${availableShapes[dragState.shapeIdx].color} border-[2px] sm:border-[3px] border-black shadow-[2px_2px_0_0_#000]` : 'bg-transparent'}`} 
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="w-full max-w-[500px] p-4">
        
        {/* Header */}
        <div className="flex flex-row justify-between items-center mb-6 sm:mb-8 border-b-[3px] border-black pb-4 gap-2">
          <h1 className="text-3xl sm:text-5xl font-black text-black tracking-tighter uppercase shrink-0 leading-none">
            Block<br/>Blaster
          </h1>
          
          <div className="flex gap-2 sm:gap-4 shrink-0">
            <div className="bg-[#ff99c8] border-[3px] border-black shadow-[2px_2px_0_0_#000] sm:shadow-[4px_4px_0_0_#000] px-2 sm:px-4 py-1 sm:py-2 text-black text-center min-w-[70px] sm:min-w-[90px]">
              <div className="text-[10px] sm:text-sm uppercase font-bold tracking-wider">Score</div>
              <div className="text-lg sm:text-2xl font-black leading-tight">{score}</div>
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
          <button 
            onClick={startNewGame} 
            className="flex-1 bg-[#ffb5a7] border-[3px] border-black shadow-[4px_4px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-y-[4px] active:translate-x-[4px] hover:-translate-y-1 hover:shadow-[6px_6px_0_0_#000] transition-all text-black font-bold py-2 px-2 sm:px-4 text-sm sm:text-base uppercase cursor-pointer"
          >
            Reset Game
          </button>
        </div>

        {/* Game Grid Container */}
        <div className="bg-white border-[4px] border-black shadow-[6px_6px_0_0_#000] sm:shadow-[8px_8px_0_0_#000] p-2 sm:p-4 relative mx-auto w-fit max-w-full mb-6">
          {gameOver && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center border-[4px] border-black m-[-4px]">
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
          
          {/* 8x8 Grid */}
          <div className="grid grid-cols-8 gap-1 sm:gap-1.5 touch-none">
            {board.map((row, rIdx) => 
              row.map((cellColor, cIdx) => {
                
                // Determine if this cell is part of the current ghost placement indicator
                let isGhost = false;
                let ghostColor = '';

                if (dragState.isDragging && dragState.hoverR !== null && dragState.hoverC !== null) {
                  const shape = availableShapes[dragState.shapeIdx];
                  const sr = rIdx - dragState.hoverR;
                  const sc = cIdx - dragState.hoverC;
                  
                  if (sr >= 0 && sr < shape.matrix.length && sc >= 0 && sc < shape.matrix[0].length) {
                    if (shape.matrix[sr][sc] === 1) {
                      isGhost = true;
                      ghostColor = shape.color;
                    }
                  }
                }

                return (
                  <div 
                    key={`${rIdx}-${cIdx}`} 
                    data-row={rIdx}
                    data-col={cIdx}
                    className={`w-8 h-8 sm:w-12 sm:h-12 transition-all duration-75 ease-in-out
                      ${cellColor 
                        ? `${cellColor} border-[2px] sm:border-[3px] border-black shadow-[2px_2px_0_0_#000]` 
                        : isGhost
                          ? `${ghostColor} opacity-50 border-[2px] sm:border-[3px] border-black border-dashed`
                          : 'bg-transparent border-[2px] border-dashed border-black/10'
                      }
                    `}
                  />
                )
              })
            )}
          </div>
        </div>

        {/* Block Dock (Spawn Area) */}
        <div className="flex justify-around items-center bg-[#fcf6bd] border-[3px] border-black p-4 shadow-[4px_4px_0_0_#000] min-h-[140px]">
          {availableShapes.map((shape, idx) => (
            <div 
              key={idx} 
              className="flex items-center justify-center w-[80px] h-[80px] touch-none"
            >
              {shape !== null && (
                <div 
                  onPointerDown={(e) => handleDragStart(e, idx)}
                  className={`transition-all duration-200 cursor-grab active:cursor-grabbing
                    ${dragState.isDragging && dragState.shapeIdx === idx ? 'opacity-20 scale-90' : 'hover:scale-110'}
                  `}
                >
                  <div className="flex flex-col gap-1 sm:gap-1.5">
                    {shape.matrix.map((row, r) => (
                      <div key={r} className="flex gap-1 sm:gap-1.5 pointer-events-none">
                        {row.map((val, c) => (
                          <div 
                            key={c} 
                            // Render mini versions of the blocks in the dock
                            className={`w-5 h-5 sm:w-6 sm:h-6 ${val ? `${shape.color} border-[2px] border-black shadow-[2px_2px_0_0_#000]` : 'bg-transparent'}`} 
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

        <p className="mt-6 text-black text-center px-4 font-bold uppercase tracking-wider text-[11px] sm:text-sm bg-white border-[3px] border-black p-2 sm:p-3 shadow-[4px_4px_0_0_#000] transform rotate-1">
          Hold and drag a shape to place it on the grid!
        </p>

      </div>
    </div>
  );
}