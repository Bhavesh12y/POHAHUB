// A classic 100-square board
const SNAKES = { 16: 6, 47: 26, 49: 11, 56: 53, 62: 19, 64: 60, 87: 24, 93: 73, 95: 75, 98: 78 };
const LADDERS = { 1: 38, 4: 14, 9: 31, 21: 42, 28: 84, 36: 44, 51: 67, 71: 91, 80: 100 };
const PLAYER_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308']; // Red, Blue, Green, Yellow

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
    lastRoll: null, // Stores { playerId, roll, message }
    snakes: SNAKES,
    ladders: LADDERS
  };
};

export const rollDice = (state, playerId) => {
  if (state.status !== 'playing') return { ok: false, error: 'Game over' };
  
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) return { ok: false, error: 'Not your turn' };

  // Roll 1-6
  const roll = Math.floor(Math.random() * 6) + 1;
  let newPosition = currentPlayer.position + roll;
  let message = `${currentPlayer.name} rolled a ${roll}.`;

  // Rule: You must roll the exact number to reach 100
  if (newPosition > 100) {
    newPosition = currentPlayer.position; // Bounce back / stay put
    message = `${currentPlayer.name} rolled a ${roll} but needs an exact number to win!`;
  } else {
    // Check Snakes and Ladders
    if (SNAKES[newPosition]) {
      newPosition = SNAKES[newPosition];
      message = `${currentPlayer.name} rolled a ${roll} and was bitten by a snake! 🐍`;
    } else if (LADDERS[newPosition]) {
      newPosition = LADDERS[newPosition];
      message = `${currentPlayer.name} rolled a ${roll} and climbed a ladder! 🪜`;
    }
  }

  currentPlayer.position = newPosition;
  state.lastRoll = { playerId, roll, message };

  // Check Win Condition
  if (newPosition === 100) {
    state.status = 'won';
    state.winner = currentPlayer;
  } else {
    // Move to next player (even if they rolled a 6, keeping it simple for smooth multiplayer sync)
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  }

  return { ok: true, state };
};

export const serializeSnakeAndLadderState = (state) => state;