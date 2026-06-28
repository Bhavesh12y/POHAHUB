import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

const getTileStyle = (val) => {
  const baseStyle = "border-[3px] sm:border-4 border-black text-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] select-none ";
  
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
    1024: baseStyle + 'bg-[#118ab2]',  
    2048: baseStyle + 'bg-[#ef476f]',  
  };
  return styles[val] || (baseStyle + 'bg-white');
};

export default function Game2048() {
  const navigate = useNavigate();
  const [board, setBoard] = useState(Array(4).fill().map(() => Array(4).fill(0)));
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  // Unified drag/swipe state
  const [dragStart, setDragStart] = useState(null);
  const minSwipeDistance = 30; // slightly lower for a more responsive feel

  useEffect(() => {
    startNewGame();
  }, []);

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

  // --- Pointer (Touch/Mouse) Handling ---
  const handlePointerDown = (e) => {
    // Capture the pointer so if they drag outside the element, we still track the release
    e.target.setPointerCapture(e.pointerId);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handlePointerUp = (e) => {
    e.target.releasePointerCapture(e.pointerId);
    if (!dragStart) return;

    const distanceX = dragStart.x - e.clientX;
    const distanceY = dragStart.y - e.clientY;
    setDragStart(null); // Reset immediately

    const isLeftSwipe = distanceX > minSwipeDistance;
    const isRightSwipe = distanceX < -minSwipeDistance;
    const isUpSwipe = distanceY > minSwipeDistance;
    const isDownSwipe = distanceY < -minSwipeDistance;

    // Check which axis had the larger movement
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      if (isLeftSwipe) processMove(moveLeft);
      if (isRightSwipe) processMove(moveRight);
    } else {
      if (isUpSwipe) processMove(moveUp);
      if (isDownSwipe) processMove(moveDown);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen font-[var(--font-family,'Comic_Sans_MS',cursive)] bg-transparent">
      <div className="w-full max-w-[500px] p-4">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b-[3px] border-black pb-4">
          <h1 className="text-5xl sm:text-6xl font-black text-black tracking-tighter uppercase">2048</h1>
          <div className="bg-[#ff99c8] border-[3px] border-black shadow-[4px_4px_0_0_#000] px-4 py-2 text-black text-center min-w-[100px]">
            <div className="text-sm uppercase font-bold tracking-wider">Score</div>
            <div className="text-2xl font-black">{score}</div>
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex justify-between items-center mb-8 gap-4">
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
          className="bg-white border-[4px] border-black shadow-[8px_8px_0_0_#000] p-3 sm:p-4 touch-none select-none relative cursor-grab active:cursor-grabbing"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp} // Failsafe if the browser cancels the drag
        >
          {gameOver && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center border-[4px] border-black m-[-4px]">
              <div className="bg-[#fcf6bd] border-[4px] border-black shadow-[6px_6px_0_0_#000] p-6 text-center transform -rotate-2">
                <h2 className="text-4xl font-black text-black mb-4 uppercase">Game Over!</h2>
                <button 
                  onClick={startNewGame}
                  className="bg-[#06d6a0] border-[3px] border-black shadow-[4px_4px_0_0_#000] active:shadow-[0_0_0_0_#000] active:translate-y-[4px] active:translate-x-[4px] text-black font-bold py-3 px-6 text-xl uppercase transition-all cursor-pointer"
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
                  className={`w-14 h-14 sm:w-24 sm:h-24 flex items-center justify-center text-2xl sm:text-4xl font-black transition-all duration-150 ease-in-out ${getTileStyle(cell)}`}
                >
                  {cell !== 0 ? cell : ''}
                </div>
              ))
            )}
          </div>
        </div>

        <p className="mt-10 text-black text-center px-4 font-bold uppercase tracking-wider text-sm sm:text-base bg-[#fcf6bd] border-[3px] border-black p-3 shadow-[4px_4px_0_0_#000] transform rotate-1">
          Swipe or click and drag to merge the numbers!
        </p>
      </div>
    </div>
  );
}