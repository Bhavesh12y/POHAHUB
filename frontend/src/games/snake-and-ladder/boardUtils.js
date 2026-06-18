/**
 * Frontend board coordinate utility
 * Mirrors backend boardCoordinates.js
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

export function getVisualCoordinates(squareNumber) {
  const { row, col } = squareToCoordinates(squareNumber);
  return {
    x: (col * 10) + 5,
    y: ((9 - row) * 10) + 5,
    squareNumber,
  };
}

export function coordinatesToSquare(row, col) {
  if (row < 0 || row > 9 || col < 0 || col > 9) {
    throw new Error(`Invalid coordinates: row=${row}, col=${col}`);
  }
  const isLeftToRight = row % 2 === 0;
  const posInRow = isLeftToRight ? col : 9 - col;
  return row * 10 + posInRow + 1;
}

export function validateSquare(squareNumber) {
  return squareNumber >= 1 && squareNumber <= 100;
}

export default {
  squareToCoordinates,
  getVisualCoordinates,
  coordinatesToSquare,
  validateSquare,
};
