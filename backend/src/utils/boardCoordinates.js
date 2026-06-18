/**
 * Single Source of Truth for Snake & Ladder Board Coordinates
 * 
 * Board Layout:
 * - 10x10 grid (100 squares)
 * - Numbered 1-100
 * - Bottom-left is square 1
 * - Even rows go left-to-right, odd rows go right-to-left (boustrophedon)
 * - Top-right is square 100
 * 
 * Visual Grid Layout:
 * Row 9 (90-100): 100 99 98 97 96 95 94 93 92 91
 * Row 8 (81-90):  81 82 83 84 85 86 87 88 89 90
 * Row 7 (71-80):  80 79 78 77 76 75 74 73 72 71
 * Row 6 (61-70):  61 62 63 64 65 66 67 68 69 70
 * Row 5 (51-60):  60 59 58 57 56 55 54 53 52 51
 * Row 4 (41-50):  41 42 43 44 45 46 47 48 49 50
 * Row 3 (31-40):  40 39 38 37 36 35 34 33 32 31
 * Row 2 (21-30):  21 22 23 24 25 26 27 28 29 30
 * Row 1 (11-20):  20 19 18 17 16 15 14 13 12 11
 * Row 0 (1-10):    1  2  3  4  5  6  7  8  9 10
 */

/**
 * Convert square number to grid coordinates
 * Returns { row, col } where both are 0-9
 * Used for positioning, rendering, and all calculations
 */
export function squareToCoordinates(squareNumber) {
  if (squareNumber < 1 || squareNumber > 100) {
    throw new Error(`Invalid square number: ${squareNumber}. Must be 1-100.`);
  }

  const row = Math.floor((squareNumber - 1) / 10);
  const isLeftToRight = row % 2 === 0;
  const posInRow = (squareNumber - 1) % 10;
  const col = isLeftToRight ? posInRow : 9 - posInRow;

  return { row, col, squareNumber };
}

/**
 * Convert grid coordinates back to square number
 */
export function coordinatesToSquare(row, col) {
  if (row < 0 || row > 9 || col < 0 || col > 9) {
    throw new Error(`Invalid coordinates: row=${row}, col=${col}. Both must be 0-9.`);
  }

  const isLeftToRight = row % 2 === 0;
  const posInRow = isLeftToRight ? col : 9 - col;
  const squareNumber = row * 10 + posInRow + 1;

  return squareNumber;
}

/**
 * Get percentage-based positioning for rendering
 * Used by SVG and CSS transforms
 * Returns { x, y } where 0-100 represent the grid
 */
export function getVisualCoordinates(squareNumber) {
  const { row, col } = squareToCoordinates(squareNumber);
  return {
    x: (col * 10) + 5,      // Center of cell X (0-100)
    y: ((9 - row) * 10) + 5, // Center of cell Y, flipped to match visual (0-100)
    squareNumber,
  };
}

/**
 * Validate board structure
 */
export function validateSquare(squareNumber) {
  return squareNumber >= 1 && squareNumber <= 100;
}

/**
 * Get all squares in a range (inclusive)
 */
export function getSquaresInRange(start, end) {
  if (start > end) [start, end] = [end, start];
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

/**
 * Verify snake structure (head > tail, both valid)
 */
export function validateSnake(head, tail) {
  if (!validateSquare(head) || !validateSquare(tail)) return false;
  if (head <= tail) return false; // Head must be lower than tail (snake goes down)
  return true;
}

/**
 * Verify ladder structure (bottom < top, both valid)
 */
export function validateLadder(bottom, top) {
  if (!validateSquare(bottom) || !validateSquare(top)) return false;
  if (bottom >= top) return false; // Bottom must be lower than top (ladder goes up)
  return true;
}

export default {
  squareToCoordinates,
  coordinatesToSquare,
  getVisualCoordinates,
  validateSquare,
  getSquaresInRange,
  validateSnake,
  validateLadder,
};
