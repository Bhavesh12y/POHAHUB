/**
 * Board Validation Utility
 * Automatically checks board integrity and detects configuration issues
 */

import { validateSquare, validateSnake, validateLadder, squareToCoordinates } from './boardUtils.js';

export function validateBoardConfiguration(snakes, ladders) {
  const issues = [];

  // Check snakes
  for (const [headStr, tailStr] of Object.entries(snakes)) {
    const head = parseInt(headStr);
    const tail = parseInt(tailStr);

    if (!validateSquare(head)) {
      issues.push(`❌ Snake head ${head} is out of bounds (1-100)`);
    }
    if (!validateSquare(tail)) {
      issues.push(`❌ Snake tail ${tail} is out of bounds (1-100)`);
    }
    if (head <= tail) {
      issues.push(`❌ Snake: head (${head}) must be > tail (${tail})`);
    }
    if (head === 100) {
      issues.push(`⚠️ Snake head at 100 prevents winning`);
    }
    if (tail === 100) {
      issues.push(`⚠️ Snake tail at 100 (unusual but allowed)`);
    }
  }

  // Check ladders
  for (const [bottomStr, topStr] of Object.entries(ladders)) {
    const bottom = parseInt(bottomStr);
    const top = parseInt(topStr);

    if (!validateSquare(bottom)) {
      issues.push(`❌ Ladder bottom ${bottom} is out of bounds (1-100)`);
    }
    if (!validateSquare(top)) {
      issues.push(`❌ Ladder top ${top} is out of bounds (1-100)`);
    }
    if (bottom >= top) {
      issues.push(`❌ Ladder: bottom (${bottom}) must be < top (${top})`);
    }
    if (bottom === 1) {
      issues.push(`⚠️ Ladder at square 1 (unusual start position)`);
    }
  }

  // Check for overlaps (snake head on ladder, etc)
  for (const head of Object.keys(snakes)) {
    const headNum = parseInt(head);
    if (ladders[headNum]) {
      issues.push(`⚠️ Snake head at ${headNum} conflicts with ladder start`);
    }
  }

  for (const bottom of Object.keys(ladders)) {
    const bottomNum = parseInt(bottom);
    if (snakes[bottomNum]) {
      issues.push(`⚠️ Ladder start at ${bottomNum} conflicts with snake head`);
    }
  }

  // Verify coordinates are valid for all positions
  const allSquares = new Set();
  Object.keys(snakes).forEach(s => allSquares.add(parseInt(s)));
  Object.values(snakes).forEach(s => allSquares.add(parseInt(s)));
  Object.keys(ladders).forEach(l => allSquares.add(parseInt(l)));
  Object.values(ladders).forEach(l => allSquares.add(parseInt(l)));

  allSquares.forEach(square => {
    try {
      squareToCoordinates(square);
    } catch (e) {
      issues.push(`❌ Square ${square} has invalid coordinates: ${e.message}`);
    }
  });

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Log board configuration for debugging
 */
export function logBoardConfiguration(snakes, ladders) {
  console.group('🐍 BOARD CONFIGURATION VALIDATION');

  const validation = validateBoardConfiguration(snakes, ladders);

  if (validation.valid) {
    console.log('✅ Board configuration is valid');
  } else {
    console.warn('⚠️ Board configuration has issues:');
    validation.issues.forEach(issue => console.warn(issue));
  }

  console.log('\n📍 Snakes:');
  Object.entries(snakes).forEach(([head, tail]) => {
    const headCoord = squareToCoordinates(parseInt(head));
    const tailCoord = squareToCoordinates(parseInt(tail));
    console.log(`  ${head} → ${tail} (head: row ${headCoord.row}, col ${headCoord.col}) → (tail: row ${tailCoord.row}, col ${tailCoord.col})`);
  });

  console.log('\n🪜 Ladders:');
  Object.entries(ladders).forEach(([bottom, top]) => {
    const bottomCoord = squareToCoordinates(parseInt(bottom));
    const topCoord = squareToCoordinates(parseInt(top));
    console.log(`  ${bottom} → ${top} (bottom: row ${bottomCoord.row}, col ${bottomCoord.col}) → (top: row ${topCoord.row}, col ${topCoord.col})`);
  });

  console.groupEnd();

  return validation;
}

/**
 * Validate a move result
 */
export function validateMoveResult(moveResult) {
  const issues = [];

  const { startPosition, roll, path, finalPosition, event } = moveResult;

  if (!path || !Array.isArray(path) || path.length === 0) {
    issues.push('❌ No valid movement path');
  }

  if (path[0] !== startPosition) {
    issues.push(`❌ Path must start at ${startPosition}, got ${path[0]}`);
  }

  if (path[path.length - 1] !== finalPosition) {
    issues.push(`❌ Path must end at ${finalPosition}, got ${path[path.length - 1]}`);
  }

  // Path should be continuous
  for (let i = 1; i < path.length; i++) {
    if (path[i] !== path[i - 1] + 1) {
      issues.push(`⚠️ Path has gap at ${i}: ${path[i - 1]} → ${path[i]}`);
    }
  }

  // Verify expected move distance
  const expectedDistance = Math.min(roll, 100 - startPosition);
  if (finalPosition > 100) {
    issues.push(`❌ Final position ${finalPosition} exceeds board (max 100)`);
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export default {
  validateBoardConfiguration,
  logBoardConfiguration,
  validateMoveResult,
};
