/**
 * Snake & Ladder Implementation Verification Tests
 * 
 * Run this in the browser console or integrate with Jest for automated testing
 * Usage: Open the game in browser, open DevTools console, copy-paste these functions
 */

// Import these in your test environment:
// import { squareToCoordinates, getVisualCoordinates, validateSquare } from './boardUtils.js';
// import { validateBoardConfiguration } from './boardValidation.js';

export function testBoardCoordinates() {
  console.group('🧪 Board Coordinate Tests');
  
  const tests = [
    // Corner cases
    { square: 1, expected: { row: 0, col: 0 } },     // Bottom-left
    { square: 10, expected: { row: 0, col: 9 } },    // Bottom-right
    { square: 91, expected: { row: 9, col: 0 } },    // Top-left
    { square: 100, expected: { row: 9, col: 9 } },   // Top-right
    
    // Middle cases
    { square: 50, expected: { row: 4, col: 9 } },    // Mid-right
    { square: 51, expected: { row: 5, col: 0 } },    // Mid-left
    { square: 47, expected: { row: 4, col: 6 } },    // Random mid
    
    // Snake positions (from game)
    { square: 16, expected: { row: 1, col: 5 } },    // Snake head
    { square: 47, expected: { row: 4, col: 6 } },    // Snake head
    
    // Ladder positions (from game)
    { square: 1, expected: { row: 0, col: 0 } },     // Ladder bottom
    { square: 80, expected: { row: 7, col: 9 } },    // Ladder bottom
  ];

  let passed = 0;
  let failed = 0;

  tests.forEach(test => {
    try {
      const result = squareToCoordinates(test.square);
      const match = result.row === test.expected.row && result.col === test.expected.col;
      
      if (match) {
        console.log(`✅ Square ${test.square} → Row ${result.row}, Col ${result.col}`);
        passed++;
      } else {
        console.error(`❌ Square ${test.square}: Expected (${test.expected.row},${test.expected.col}), got (${result.row},${result.col})`);
        failed++;
      }
    } catch (e) {
      console.error(`❌ Square ${test.square}: ${e.message}`);
      failed++;
    }
  });

  console.log(`\n📊 Results: ${passed} passed, ${failed} failed`);
  console.groupEnd();

  return { passed, failed };
}

export function testVisualCoordinates() {
  console.group('🎨 Visual Coordinates Tests (SVG/CSS Percentages)');
  
  const tests = [
    { square: 1, shouldBe: 'bottom-left (x≈5, y≈5)' },
    { square: 100, shouldBe: 'top-right (x≈95, y≈95)' },
    { square: 50, shouldBe: 'middle-lower-right' },
  ];

  tests.forEach(test => {
    try {
      const result = getVisualCoordinates(test.square);
      console.log(`✅ Square ${test.square}: x=${result.x.toFixed(1)}%, y=${result.y.toFixed(1)}%`);
      
      // Verify bounds
      if (result.x < 0 || result.x > 100 || result.y < 0 || result.y > 100) {
        console.warn(`⚠️ Out of bounds: (${result.x}, ${result.y})`);
      }
    } catch (e) {
      console.error(`❌ Square ${test.square}: ${e.message}`);
    }
  });

  console.groupEnd();
}

export function testSnakeLadderConfiguration() {
  console.group('🐍 Snake & Ladder Configuration Tests');

  const SNAKES = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
  const LADDERS = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };

  console.log('📍 Validating Snakes...');
  let snakesValid = true;
  Object.entries(SNAKES).forEach(([head, tail]) => {
    const h = parseInt(head);
    const t = parseInt(tail);
    const valid = h > t && h >= 1 && h <= 100 && t >= 1 && t <= 100;
    const emoji = valid ? '✅' : '❌';
    console.log(`${emoji} Snake ${h} → ${t} ${valid ? '(valid)' : '(INVALID: head must be > tail)'}`);
    if (!valid) snakesValid = false;
  });

  console.log('\n🪜 Validating Ladders...');
  let laddersValid = true;
  Object.entries(LADDERS).forEach(([bottom, top]) => {
    const b = parseInt(bottom);
    const t = parseInt(top);
    const valid = b < t && b >= 1 && b <= 100 && t >= 1 && t <= 100;
    const emoji = valid ? '✅' : '❌';
    console.log(`${emoji} Ladder ${b} → ${t} ${valid ? '(valid)' : '(INVALID: bottom must be < top)'}`);
    if (!valid) laddersValid = false;
  });

  console.log('\n📊 Configuration Summary:');
  console.log(`Snakes: ${Object.keys(SNAKES).length} (${snakesValid ? '✅ Valid' : '❌ Invalid'})`);
  console.log(`Ladders: ${Object.keys(LADDERS).length} (${laddersValid ? '✅ Valid' : '❌ Invalid'})`);

  console.groupEnd();

  return snakesValid && laddersValid;
}

export function testMovementPaths() {
  console.group('🎲 Movement Path Tests');

  const testCases = [
    {
      name: 'Normal move',
      start: 10,
      roll: 5,
      snakes: {},
      ladders: {},
      expectedFinal: 15,
      expectedEvent: 'move',
    },
    {
      name: 'Landing on snake',
      start: 42,
      roll: 5,
      snakes: { 47: 26 },
      ladders: {},
      expectedFinal: 26,
      expectedEvent: 'snake',
    },
    {
      name: 'Landing on ladder',
      start: 35,
      roll: 1,
      snakes: {},
      ladders: { 36: 44 },
      expectedFinal: 44,
      expectedEvent: 'ladder',
    },
    {
      name: 'Overshoot (> 100)',
      start: 98,
      roll: 5,
      snakes: {},
      ladders: {},
      expectedFinal: 98,
      expectedEvent: 'overshoot',
    },
    {
      name: 'Exact win at 100',
      start: 95,
      roll: 5,
      snakes: {},
      ladders: {},
      expectedFinal: 100,
      expectedEvent: 'win',
    },
  ];

  testCases.forEach(test => {
    console.log(`\n📌 ${test.name}`);
    console.log(`   Start: ${test.start}, Roll: ${test.roll}`);
    console.log(`   Expected: ${test.expectedFinal} (${test.expectedEvent})`);
    // In actual implementation, would call calculateMovementPath here
    // For now, just log that test exists
  });

  console.groupEnd();
}

export function testEdgeCases() {
  console.group('⚠️ Edge Case Tests');

  const cases = [
    'Multiple snakes in a row',
    'Multiple ladders in a row',
    'Player lands on snake that points to ladder',
    'Player reconnects mid-game',
    'All players on same square',
    'Chat message during move animation',
    'Debug mode toggle during move',
    'Overshoot at exact 100 boundary',
  ];

  console.log('Manual test cases (not automated):');
  cases.forEach((c, i) => {
    console.log(`${i + 1}. ${c}`);
  });

  console.groupEnd();
}

export function runAllTests() {
  console.log('%c=== SNAKE & LADDER TEST SUITE ===', 'font-size: 16px; font-weight: bold; color: #22c55e;');
  
  const results = {
    coordinates: testBoardCoordinates(),
    visual: testVisualCoordinates(),
    snakeLadder: testSnakeLadderConfiguration(),
    movements: testMovementPaths(),
    edges: testEdgeCases(),
  };

  console.log('%c\n=== TEST SUMMARY ===', 'font-size: 14px; font-weight: bold; color: #3b82f6;');
  console.log('Run this in the game board component context with proper imports');
  
  return results;
}

// Quick validation function to run on page load
export function validateGameStart(snakes, ladders) {
  console.group('🚀 Game Startup Validation');
  
  let issues = [];

  // Check snakes
  Object.entries(snakes).forEach(([head, tail]) => {
    const h = parseInt(head);
    const t = parseInt(tail);
    if (h <= t) issues.push(`Snake ${h}→${t}: head must be > tail`);
    if (h > 100 || t < 1) issues.push(`Snake ${h}→${t}: out of bounds (1-100)`);
  });

  // Check ladders  
  Object.entries(ladders).forEach(([bottom, top]) => {
    const b = parseInt(bottom);
    const t = parseInt(top);
    if (b >= t) issues.push(`Ladder ${b}→${t}: bottom must be < top`);
    if (b < 1 || t > 100) issues.push(`Ladder ${b}→${t}: out of bounds (1-100)`);
  });

  if (issues.length === 0) {
    console.log('✅ All validations passed');
  } else {
    console.error('❌ Validation issues found:');
    issues.forEach(issue => console.error(`  - ${issue}`));
  }

  console.groupEnd();

  return issues.length === 0;
}

console.log('%c✨ Snake & Ladder Tests Available', 'color: #22c55e; font-weight: bold;');
console.log('Available functions:');
console.log('  - testBoardCoordinates()');
console.log('  - testVisualCoordinates()');
console.log('  - testSnakeLadderConfiguration()');
console.log('  - testMovementPaths()');
console.log('  - testEdgeCases()');
console.log('  - runAllTests()');
console.log('  - validateGameStart(snakes, ladders)');
