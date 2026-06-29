import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const getTileStyle = (val) => {
  const baseStyle = "border-[3px] sm:border-4 border-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] select-none flex items-center justify-center font-black transition-all duration-150 ease-in-out ";
  
  const styles = {
    0: 'bg-transparent border-[3px] sm:border-4 border-dashed border-black/20 text-transparent shadow-none',
    2: baseStyle + 'bg-[#ff99c8]',     
    4: baseStyle + 'bg-[#a9def9]',     
    8: baseStyle + 'bg-[#fcf6bd]',     
    16: baseStyle + 'bg-[#d0f4de]',    
    32: baseStyle + 'bg-[#e4c1f9]',    
    64: baseStyle + 'bg-[#ffb5a7]',    
    128: baseStyle + 'bg-[#fec89a]',   
    256: baseStyle + 'bg-[#ffd166]',   
    512: baseStyle + 'bg-[#06d6a0]',   
    1024: baseStyle + 'bg-[#118ab2] text-white',  
    2048: baseStyle + 'bg-[#ef476f] text-white',  
  };
  return styles[val] || (baseStyle + 'bg-white');
};

export default function Game2048() {
  const navigate = useNavigate();
  const [board, setBoard] = useState(Array(4).fill().map(() => Array(4).fill(0)));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  
  // Initialize High Score from localStorage
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('2048-highScore');
    return saved !== null ? parseInt(saved, 10) : 0;
  });

  // Unified drag/swipe state
  const [dragStart, setDragStart] = useState(null);
  const minSwipeDistance = 25; // Lowered slightly for better mobile responsiveness

  useEffect(() => {
    startNewGame();
  }, []);

  // Update High Score whenever current score exceeds it
  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('2048-highScore', score.toString());
    }
  }, [score, highScore]);

  const startNewGame = () => {
    let newBoard = Array(4).fill().map(() => Array(4).fill(0));
    addRandomTile(newBoard);
    addRandomTile(newBoard);
    setBoard(newBoard);
    setScore(0);
    setGameOver(false);
  };

  const addRandomTile = (grid) => {
    let emptyCells = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (grid[r][c] === 0) emptyCells.push({ r, c });
      }
    }
    if (emptyCells.length > 0) {
      const { r, c } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
      grid[r][c] = Math.random() < 0.9 ? 2 : 4;
    }
  };

  // --- Game Logic ---
  const slide = (row) => {
    let arr = row.filter(val => val);
    let missing = 4 - arr.length;
    let zeros = Array(missing).fill(0);
    return arr.concat(zeros);
  };

  const combine = (row) => {
    let addedScore = 0;
    for (let i = 0; i < 3; i++) {
      if (row[i] !== 0 && row[i] === row[i + 1]) {
        row[i] *= 2;
        row[i + 1] = 0;
        addedScore += row[i];
      }
    }
    return { newRow: row, addedScore };
  };

  const operate = (row) => {
    let s1 = slide(row);
    let { newRow, addedScore } = combine(s1);
    let s2 = slide(newRow);
    return { finalRow: s2, scoreInc: addedScore };
  };

  const checkGameOver = (currentBoard) => {
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        if (currentBoard[r][c] === 0) return false;
      }
    }
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 3; c++) {
        if (currentBoard[r][c] === currentBoard[r][c + 1]) return false;
      }
    }
    for (let c = 0; c < 4; c++) {
      for (let r = 0; r < 3; r++) {
        if (currentBoard[r][c] === currentBoard[r + 1][c]) return false;
      }
    }
    return true;
  };

  const processMove = useCallback((moveFunction) => {
    if (gameOver) return;
    const res = moveFunction([...board.map(r => [...r])]);
    if (JSON.stringify(board) !== JSON.stringify(res.newBoard)) {
      addRandomTile(res.newBoard);
      setBoard(res.newBoard);
      setScore(s => s + res.scoreInc);
      if (checkGameOver(res.newBoard)) {
        setGameOver(true);
      }
    }
  }, [board, gameOver]);

  const moveLeft = useCallback((currentBoard) => {
    let newBoard = [];
    let scoreInc = 0;
    for (let r = 0; r < 4; r++) {
      let { finalRow, scoreInc: inc } = operate(currentBoard[r]);
      newBoard.push(finalRow);
      scoreInc += inc;
    }
    return { newBoard, scoreInc };
  }, []);

  const moveRight = useCallback((currentBoard) => {
    let newBoard = [];
    let scoreInc = 0;
    for (let r = 0; r < 4; r++) {
      let reversed = [...currentBoard[r]].reverse();
      let { finalRow, scoreInc: inc } = operate(reversed);
      newBoard.push(finalRow.reverse());
      scoreInc += inc;
    }
    return { newBoard, scoreInc };
  }, []);

  const moveUp = useCallback((currentBoard) => {
    let newBoard = Array(4).fill().map(() => Array(4).fill(0));
    let scoreInc = 0;
    for (let c = 0; c < 4; c++) {
      let col = [currentBoard[0][c], currentBoard[1][c], currentBoard[2][c], currentBoard[3][c]];
      let { finalRow, scoreInc: inc } = operate(col);
      for (let r = 0; r < 4; r++) newBoard[r][c] = finalRow[r];
      scoreInc += inc;
    }
    return { newBoard, scoreInc };
  }, []);

  const moveDown = useCallback((currentBoard) => {
    let newBoard = Array(4).fill().map(() => Array(4).fill(0));
    let scoreInc = 0;
    for (let c = 0; c < 4; c++) {
      let col = [currentBoard[0][c], currentBoard[1][c], currentBoard[2][c], currentBoard[3][c]].reverse();
      let { finalRow, scoreInc: inc } = operate(col);
      finalRow.reverse();
      for (let r = 0; r < 4; r++) newBoard[r][c] = finalRow[r];
      scoreInc += inc;
    }
    return { newBoard, scoreInc };
  }, []);

  // --- Keyboard Handling (Crucial for testing/desktop users) ---
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent default scrolling for arrow keys while playing
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
        e.preventDefault();
      }
      
      if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a') processMove(moveLeft);
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd') processMove(moveRight);
      if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') processMove(moveUp);
      if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') processMove(moveDown);
    };

    window.addEventListener('keydown', handleKeyDown, { passive: false });
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [processMove, moveLeft, moveRight, moveUp, moveDown]);

  // --- Pointer (Touch/Mouse) Handling ---
  const handlePointerDown = (e) => {
    e.target.setPointerCapture(e.pointerId);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e) => {
    e.target.releasePointerCapture(e.pointerId);
    if (!dragStart) return;

    const distanceX = dragStart.x - e.clientX;
    const distanceY = dragStart.y - e.clientY;
    setDragStart(null);

    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isUpSwipe = distanceY > minSwipeDistance;
    const isDownSwipe = distanceY < -minSwipeDistance;

    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (isLeftSwipe) processMove(moveLeft);
      if (isRightSwipe) processMove(moveRight);
    } else {
      if (isUpSwipe) processMove(moveUp);
      if (isDownSwipe) processMove(moveDown);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-[var(--font-family,'Comic_Sans_MS',cursive)] bg-transparent overflow-hidden">
      <div className="w-full max-w-[500px] p-4">
        
        {/* Header - Adjusted for mobile fit */}
        <div className="flex flex-row justify-between items-center mb-6 sm:mb-8 border-b-[3px] border-black pb-4 gap-2">
          <h1 className="text-4xl sm:text-6xl font-black text-black tracking-tighter uppercase shrink-0">2048</h1>
          
          <div className="flex gap-2 sm:gap-4 shrink-0">
            {/* Current Score Box */}
            <div className="bg-[#ff99c8] border-[3px] border-black shadow-[2px_2px_0_0_#000] sm:shadow-[4px_4px_0_0_#000] px-2 sm:px-4 py-1 sm:py-2 text-black text-center min-w-[70px] sm:min-w-[90px]">
              <div className="text-[10px] sm:text-sm uppercase font-bold tracking-wider">Score</div>
              <div className="text-lg sm:text-2xl font-black leading-tight">{score}</div>
            </div>
            {/* High Score Box */}
            <div className="bg-[#ffd166] border-[3px] border-black shadow-[2px_2px_0_0_#000] sm:shadow-[4px_4px_0_0_#000] px-2 sm:px-4 py-1 sm:py-2 text-black text-center min-w-[70px] sm:min-w-[90px]">
              <div className="text-[10px] sm:text-sm uppercase font-bold tracking-wider">Best</div>
              <div className="text-lg sm:text-2xl font-black leading-tight">{highScore}</div>
            </div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex justify-between items-center mb-6 sm:mb-8 gap-4">
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
        <div 
          className="bg-white border-[4px] border-black shadow-[6px_6px_0_0_#000] sm:shadow-[8px_8px_0_0_#000] p-2 sm:p-4 touch-none select-none relative cursor-grab active:cursor-grabbing mx-auto w-fit max-w-full"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp} // Failsafe for mobile drag interruptions
        >
          {gameOver && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center border-[4px] border-black m-[-4px]">
              <div className="bg-[#fcf6bd] border-[4px] border-black shadow-[6px_6px_0_0_#000] p-4 sm:p-6 text-center transform -rotate-2">
                <h2 className="text-3xl sm:text-4xl font-black text-black mb-4 uppercase">Game Over!</h2>
                <button 
                  onClick={startNewGame}
                  className="bg-[#06d6a0] border-[3px] border-black shadow-[4px_4px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-y-[4px] active:translate-x-[4px] text-black font-bold py-2 px-4 sm:py-3 sm:px-6 text-lg sm:text-xl uppercase transition-all cursor-pointer"
                >
                  Try Again
                </button>
              </div>
            </div>
          )}
          
          <div className="grid grid-cols-4 gap-2 sm:gap-3 pointer-events-none">
            {board.map((row, rIdx) => 
              row.map((cell, cIdx) => (
                <div 
                  key={`${rIdx}-${cIdx}`} 
                  // Scaled to w-16 h-16 (64px) for better tapping/swiping on mobile displays
                  className={`w-16 h-16 sm:w-24 sm:h-24 text-2xl sm:text-4xl ${getTileStyle(cell)}`}
                >
                  {cell !== 0 ? cell : ''}
                </div>
              ))
            )}
          </div>
        </div>

        <p className="mt-8 text-black text-center px-4 font-bold uppercase tracking-wider text-[11px] sm:text-base bg-[#fcf6bd] border-[3px] border-black p-2 sm:p-3 shadow-[4px_4px_0_0_#000] transform rotate-1">
          Use Arrow Keys, WASD, or Swipe to merge!
        </p>
      </div>
    </div>
  );
}