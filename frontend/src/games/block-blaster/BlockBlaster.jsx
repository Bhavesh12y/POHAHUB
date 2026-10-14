import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import ArcadeShell, { GameOverOverlay, useArcadeScores } from '../three/ArcadeShell.jsx';

const BlockScene = lazy(() => import('./BlockScene.jsx'));

// 'size' keeps each hand of three pieces fair (one small, one medium/large, one random).
const SHAPES = [
  { id: '1x1', matrix: [[1]], color: 'bg-[#ff6fae]', size: 'small' },
  { id: '2x2', matrix: [[1, 1], [1, 1]], color: 'bg-[#5cc6f5]', size: 'medium' },
  { id: '3x3', matrix: [[1, 1, 1], [1, 1, 1], [1, 1, 1]], color: 'bg-[#ffe14d]', size: 'large' },
  { id: 'h2', matrix: [[1, 1]], color: 'bg-[#5fdc9c]', size: 'small' },
  { id: 'v2', matrix: [[1], [1]], color: 'bg-[#5fdc9c]', size: 'small' },
  { id: 'h3', matrix: [[1, 1, 1]], color: 'bg-[#bb86f7]', size: 'medium' },
  { id: 'v3', matrix: [[1], [1], [1]], color: 'bg-[#bb86f7]', size: 'medium' },
  { id: 'h4', matrix: [[1, 1, 1, 1]], color: 'bg-[#ff8a72]', size: 'large' },
  { id: 'v4', matrix: [[1], [1], [1], [1]], color: 'bg-[#ff8a72]', size: 'large' },
  { id: 'L-right', matrix: [[1, 0], [1, 0], [1, 1]], color: 'bg-[#ffbf2e]', size: 'medium' },
  { id: 'L-left', matrix: [[0, 1], [0, 1], [1, 1]], color: 'bg-[#06d6a0]', size: 'medium' },
  { id: 'T-up', matrix: [[0, 1, 0], [1, 1, 1]], color: 'bg-[#1a9fd0]', size: 'medium' },
];
const GRID_SIZE = 8;
const LINE_SCORES = { 1: 10, 2: 25, 3: 45, 4: 70, 5: 100, 6: 150 };
const emptyBoard = () => Array.from({ length: GRID_SIZE }, () => Array(GRID_SIZE).fill(null));
// The page is CSS-zoomed on high-DPI desktops; fixed elements inside it need
// pointer coordinates divided by that zoom to sit under the cursor.
function appZoom() {
  if (typeof window === 'undefined') return 1;
  return parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--app-zoom')) || 1;
}

const IDLE_DRAG = { isDragging: false, shapeIdx: null, x: 0, y: 0, hoverR: null, hoverC: null, isValidHover: false };

function generateShapes() {
  const pick = (list) => list[Math.floor(Math.random() * list.length)];
  const smalls = SHAPES.filter((s) => s.size === 'small');
  const mediums = SHAPES.filter((s) => s.size === 'medium');
  const larges = SHAPES.filter((s) => s.size === 'large');
  return [pick(smalls), Math.random() > 0.5 ? pick(mediums) : pick(larges), pick(SHAPES)].sort(() => Math.random() - 0.5);
}

function canPlaceShape(board, shape, startR, startC) {
  if (!shape || startR === null || startC === null) return false;
  for (let r = 0; r < shape.matrix.length; r++) {
    for (let c = 0; c < shape.matrix[0].length; c++) {
      if (!shape.matrix[r][c]) continue;
      const rr = startR + r;
      const cc = startC + c;
      if (rr < 0 || rr >= GRID_SIZE || cc < 0 || cc >= GRID_SIZE || board[rr][cc] !== null) return false;
    }
  }
  return true;
}

function checkGameOver(board, shapes) {
  const remaining = shapes.filter(Boolean);
  if (remaining.length === 0) return false;
  for (const shape of remaining) {
    for (let r = 0; r < GRID_SIZE; r++) for (let c = 0; c < GRID_SIZE; c++) if (canPlaceShape(board, shape, r, c)) return false;
  }
  return true;
}

function fullLines(board) {
  const rows = [];
  const cols = [];
  for (let i = 0; i < GRID_SIZE; i++) if (board[i].every((cell) => cell !== null)) rows.push(i);
  for (let j = 0; j < GRID_SIZE; j++) if (board.every((row) => row[j] !== null)) cols.push(j);
  return { rows, cols };
}

function ShapePreview({ shape, cell = 'w-5 h-5 sm:w-6 sm:h-6' }) {
  return (
    <div className="flex flex-col gap-1 pointer-events-none">
      {shape.matrix.map((row, r) => (
        <div key={r} className="flex gap-1">
          {row.map((val, c) => (
            <div key={c} className={`${cell} ${val ? `${shape.color} border-[2px] border-black shadow-[2px_2px_0_0_#000]` : 'bg-transparent'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export default function BlockBlaster() {
  const pickRef = useRef(null);
  const dragNodeRef = useRef(null);
  const boardRef = useRef(emptyBoard());
  const shapesRef = useRef([]);
  const scoreRef = useRef(0);
  const comboRef = useRef(1);
  const gameOverRef = useRef(false);
  const clearingRef = useRef(false);
  const dragRef = useRef(IDLE_DRAG);
  const popupId = useRef(0);

  const [board, setBoard] = useState(boardRef.current);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [gameOver, setGameOver] = useState(false);
  const [shapes, setShapes] = useState([]);
  const [clearingCells, setClearingCells] = useState([]);
  const [isShaking, setIsShaking] = useState(false);
  const [popups, setPopups] = useState([]);
  const [drag, setDrag] = useState(IDLE_DRAG);
  const { highScore, leaderboard } = useArcadeScores('block-blaster', 'blockblaster-highScore', score, gameOver);

  const triggerPopup = (text, type) => {
    const id = popupId.current++;
    setPopups((prev) => [...prev, { id, text, type }]);
    setTimeout(() => setPopups((prev) => prev.filter((p) => p.id !== id)), 1000);
  };

  const sync = (nextBoard, nextShapes, nextScore, over) => {
    boardRef.current = nextBoard;
    shapesRef.current = nextShapes;
    scoreRef.current = nextScore;
    gameOverRef.current = over;
    setBoard(nextBoard);
    setShapes(nextShapes);
    setScore(nextScore);
    setGameOver(over);
  };

  const startNewGame = useCallback(() => {
    comboRef.current = 1;
    setCombo(1);
    sync(emptyBoard(), generateShapes(), 0, false);
  }, []);

  useEffect(() => {
    startNewGame();
  }, [startNewGame]);

  const placeShape = useCallback((r, c, shapeIndex) => {
    const shape = shapesRef.current[shapeIndex];
    if (!canPlaceShape(boardRef.current, shape, r, c)) return;

    const placed = boardRef.current.map((row) => [...row]);
    let blocks = 0;
    shape.matrix.forEach((row, sr) =>
      row.forEach((val, sc) => {
        if (val) {
          placed[r + sr][c + sc] = shape.color;
          blocks += 1;
        }
      }),
    );

    let nextShapes = [...shapesRef.current];
    nextShapes[shapeIndex] = null;
    if (nextShapes.every((s) => s === null)) nextShapes = generateShapes();

    const { rows, cols } = fullLines(placed);
    const lines = rows.length + cols.length;
    let nextScore = scoreRef.current + blocks;

    if (lines === 0) {
      comboRef.current = 1;
      setCombo(1);
      sync(placed, nextShapes, nextScore, checkGameOver(placed, nextShapes));
      return;
    }

    const earned = LINE_SCORES[Math.min(lines, 6)] * comboRef.current;
    nextScore += earned;
    triggerPopup(`+${earned}`, 'score');
    if (comboRef.current > 1) triggerPopup(`${comboRef.current}x COMBO!`, 'combo');
    if (lines >= 3) triggerPopup('AWESOME!', 'praise');
    comboRef.current += 1;
    setCombo(comboRef.current);

    const cleared = placed.map((row) => [...row]);
    const ids = [];
    rows.forEach((ri) => cleared[ri].forEach((_, ci) => ((cleared[ri][ci] = null), ids.push(`${ri}-${ci}`))));
    cols.forEach((ci) => cleared.forEach((row, ri) => ((row[ci] = null), ids.push(`${ri}-${ci}`))));

    // Show the placed piece first, let the cleared cubes fly off, then settle.
    boardRef.current = placed;
    setBoard(placed);
    shapesRef.current = nextShapes;
    setShapes(nextShapes);
    scoreRef.current = nextScore;
    setScore(nextScore);
    const over = checkGameOver(cleared, nextShapes);
    gameOverRef.current = over;
    clearingRef.current = true;
    setClearingCells(ids);
    setIsShaking(true);
    setTimeout(() => {
      boardRef.current = cleared;
      setBoard(cleared);
      setClearingCells([]);
      setIsShaking(false);
      setGameOver(over);
      clearingRef.current = false;
    }, 480);
  }, []);

  const handlePointerDown = (e, idx) => {
    if (!shapesRef.current[idx] || gameOverRef.current || clearingRef.current) return;
    e.preventDefault();
    dragRef.current = { ...IDLE_DRAG, isDragging: true, shapeIdx: idx, x: e.clientX, y: e.clientY };
    setDrag({ ...dragRef.current });
    document.body.style.overflow = 'hidden';
  };

  useEffect(() => {
    const onMove = (e) => {
      const state = dragRef.current;
      if (!state.isDragging) return;
      const x = e.clientX;
      const y = e.clientY;
      if (dragNodeRef.current) {
        const zoom = appZoom();
        dragNodeRef.current.style.left = `${x / zoom}px`;
        dragNodeRef.current.style.top = `${y / zoom}px`;
      }

      // Snap using the centre of the dragged piece's top-left block, raycast into the 3D board.
      let r = null;
      let c = null;
      let valid = false;
      const node = dragNodeRef.current?.firstElementChild?.firstElementChild?.firstElementChild;
      if (node && pickRef.current) {
        const rect = node.getBoundingClientRect();
        const cell = pickRef.current(rect.left + rect.width / 2, rect.top + rect.height / 2);
        if (cell && cell.r >= -2 && cell.r < GRID_SIZE + 2 && cell.c >= -2 && cell.c < GRID_SIZE + 2) {
          r = cell.r;
          c = cell.c;
          valid = canPlaceShape(boardRef.current, shapesRef.current[state.shapeIdx], r, c);
        }
      }

      if (state.hoverR !== r || state.hoverC !== c || state.isValidHover !== valid) {
        dragRef.current = { ...state, x, y, hoverR: r, hoverC: c, isValidHover: valid };
        setDrag({ ...dragRef.current });
      } else {
        state.x = x;
        state.y = y;
      }
    };
    const onUp = () => {
      const state = dragRef.current;
      if (!state.isDragging) return;
      if (state.isValidHover) placeShape(state.hoverR, state.hoverC, state.shapeIdx);
      dragRef.current = IDLE_DRAG;
      setDrag(IDLE_DRAG);
      document.body.style.overflow = '';
    };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      document.body.style.overflow = '';
    };
  }, [placeShape]);

  // Ghost preview + which lines this drop would clear.
  const ghostCells = [];
  let predictedRows = [];
  let predictedCols = [];
  const dragShape = drag.isDragging ? shapes[drag.shapeIdx] : null;
  if (dragShape && drag.hoverR !== null) {
    const temp = board.map((row) => [...row]);
    dragShape.matrix.forEach((row, sr) =>
      row.forEach((val, sc) => {
        const rr = drag.hoverR + sr;
        const cc = drag.hoverC + sc;
        if (val && rr >= 0 && rr < GRID_SIZE && cc >= 0 && cc < GRID_SIZE) {
          ghostCells.push({ r: rr, c: cc, valid: drag.isValidHover, color: dragShape.color });
          temp[rr][cc] = dragShape.color;
        }
      }),
    );
    if (drag.isValidHover) ({ rows: predictedRows, cols: predictedCols } = fullLines(temp));
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;

  const dock = (
    <div className="space-y-3">
      <div className="bg-white border-[3px] border-black shadow-[3px_3px_0_0_#000] py-1.5 text-center font-black uppercase">
        Combo: {combo}x
      </div>
      <div className="flex justify-around items-center bg-[#fcf6bd] border-[3px] border-black p-2 shadow-[4px_4px_0_0_#000] min-h-[120px]">
        {shapes.map((shape, idx) => (
          <div key={idx} className="flex items-center justify-center w-[86px] h-[100px] touch-none">
            {shape && (
              <div
                onPointerDown={(e) => handlePointerDown(e, idx)}
                className={`transition-all duration-200 cursor-grab active:cursor-grabbing ${drag.isDragging && drag.shapeIdx === idx ? 'opacity-20 scale-90' : 'hover:scale-110'}`}
              >
                <ShapePreview shape={shape} />
              </div>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={startNewGame}
        className="w-full bg-white border-[3px] border-black shadow-[3px_3px_0_0_#000] hover:-translate-y-0.5 transition-all font-black py-2 uppercase text-sm"
      >
        New Game
      </button>
    </div>
  );

  return (
    <>
      {dragShape && (
        <div
          ref={dragNodeRef}
          className="fixed pointer-events-none z-50 drop-shadow-[0_15px_15px_rgba(0,0,0,0.35)]"
          style={{ left: drag.x / appZoom(), top: drag.y / appZoom(), transform: `translate(-50%, calc(-100% - ${isMobile ? 70 : 36}px))` }}
        >
          <div className="flex flex-col gap-1">
            {dragShape.matrix.map((row, r) => (
              <div key={r} className="flex gap-1">
                {row.map((val, c) => (
                  <div
                    key={c}
                    className={`w-9 h-9 sm:w-11 sm:h-11 ${val ? (drag.hoverR !== null && !drag.isValidHover ? 'bg-red-500 opacity-80' : dragShape.color) + ' border-[3px] border-black shadow-[2px_2px_0_0_#000]' : 'bg-transparent'}`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="fixed inset-0 pointer-events-none z-40 flex items-center justify-center">
        <style>{`@keyframes bbFloat { 0% { transform: translateY(0) scale(1); opacity: 1; } 100% { transform: translateY(-40px) scale(1.2); opacity: 0; } } .bb-float { animation: bbFloat 1s ease-out forwards; }`}</style>
        {popups.map((popup) => (
          <div key={popup.id} className="absolute bb-float">
            <span
              className={`font-black uppercase text-3xl drop-shadow-[2px_2px_0_#000] ${popup.type === 'combo' ? 'text-[#ffbf2e]' : popup.type === 'praise' ? 'text-[#06d6a0]' : 'text-[#ff6fae]'}`}
            >
              {popup.text}
            </span>
          </div>
        ))}
      </div>

      <ArcadeShell
        title="Block Blaster"
        score={score}
        highScore={highScore}
        leaderboard={leaderboard}
        stageClass="stage-square"
        controls={dock}
        hint="Drag pieces onto the 8 x 8 board. Fill a row or column to clear it; clear on consecutive moves to build a combo."
        overlay={gameOver && <GameOverOverlay title="Game Over!" score={score} onRetry={startNewGame} />}
      >
        <Suspense fallback={<div className="h-full flex items-center justify-center font-black uppercase animate-pulse">Loading 3D...</div>}>
          <BlockScene
            board={board}
            ghostCells={ghostCells}
            predictedRows={predictedRows}
            predictedCols={predictedCols}
            clearingCells={clearingCells}
            shaking={isShaking}
            pickRef={pickRef}
          />
        </Suspense>
      </ArcadeShell>
    </>
  );
}
