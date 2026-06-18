// A classic 100-square board
const SNAKES = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
const LADDERS = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };
const PLAYER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308']; // Red, Blue, Green, Yellow

/**
 * Create initial game state
 */
export const createSnakeAndLadderState = (players) => {
  return {
    players: players.map((p, i) => ({ 
      ...p, 
      position: 0, // 0 means they haven't started (off the board)
      color: PLAYER_COLORS[i % PLAYER_COLORS.length] 
    })),
    currentPlayerIndex: 0,
    status: 'playing',
    winner: null,
    lastMove: null, // Stores complete move data with path
    snakes: SNAKES,
    ladders: LADDERS,
  };
};

/**
 * Calculate movement path and final position
 * Returns exact path from start to finish, including snake/ladder effects
 */
function calculateMovementPath(startPosition, roll, snakes, ladders) {
  const path = [startPosition];
  let currentPos = startPosition + roll;

  // Rule: must land exactly on 100 to win
  if (currentPos > 100) {
    // Overshoot: stay at current position
    return {
      path: [startPosition],
      finalPosition: startPosition,
      event: 'overshoot',
      message: `Rolled ${roll} but overshot 100! Stay at ${startPosition}.`
    };
  }

  // Add intermediate positions from start to roll destination
  for (let i = startPosition + 1; i <= currentPos; i++) {
    path.push(i);
  }

  let event = 'move';
  let message = `Rolled a ${roll}.`;

  // Check for snake at landing position
  if (snakes[currentPos]) {
    const snakeTail = snakes[currentPos];
    // Add snake path (immediate transition)
    message = `Rolled a ${roll} and hit a snake! 🐍 ${currentPos} → ${snakeTail}`;
    event = 'snake';
    currentPos = snakeTail;
  }
  // Check for ladder at landing position
  else if (ladders[currentPos]) {
    const ladderTop = ladders[currentPos];
    // Add ladder path (immediate transition)
    message = `Rolled a ${roll} and climbed a ladder! 🪜 ${currentPos} → ${ladderTop}`;
    event = 'ladder';
    currentPos = ladderTop;
  }

  // Check if player reached 100
  if (currentPos === 100) {
    event = 'win';
    message = `Rolled a ${roll} and WON! 🎉`;
  }

  return {
    path,
    finalPosition: currentPos,
    event,
    message,
  };
}

/**
 * Process a dice roll
 * Returns complete move data including path for client animation
 */
export const rollDice = (state, playerId) => {
  if (state.status !== 'playing') return { ok: false, error: 'Game over' };
  
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) return { ok: false, error: 'Not your turn' };

  const roll = Math.floor(Math.random() * 6) + 1;
  const startPosition = currentPlayer.position;

  // Calculate complete movement with path
  const moveData = calculateMovementPath(startPosition, roll, state.snakes, state.ladders);

  currentPlayer.position = moveData.finalPosition;
  
  // Store complete move for broadcast
  state.lastMove = {
    playerId,
    playerName: currentPlayer.name,
    roll,
    startPosition,
    path: moveData.path,
    finalPosition: moveData.finalPosition,
    event: moveData.event,
    message: moveData.message,
    timestamp: Date.now(),
  };

  // Check win condition
  if (moveData.event === 'win') {
    state.status = 'won';
    state.winner = currentPlayer;
  } else {
    // Move to next player
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  }

  return { ok: true, state };
};

/**
 * Serialize state for transmission to client
 */
export const serializeSnakeAndLadderState = (state) => state;