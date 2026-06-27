// backend/src/games/ludo.js

const LUDO_COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308']; // Red, Blue, Green, Yellow
const START_OFFSETS = { '#ef4444': 0, '#3b82f6': 13, '#22c55e': 26, '#eab308': 39 };

// Absolute board positions that are safe (Start squares + star squares)
const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];

export const createLudoState = (players) => {
  return {
    players: players.map((p, i) => ({
      ...p,
      color: LUDO_COLORS[i % LUDO_COLORS.length],
      // -1 = Base, 0 = Start, 1-51 = Main Board, 52-56 = Home Path, 57 = Finished
      tokens: [
        { id: 0, position: -1 },
        { id: 1, position: -1 },
        { id: 2, position: -1 },
        { id: 3, position: -1 }
      ],
      finishedCount: 0
    })),
    currentPlayerIndex: 0,
    status: 'playing',
    winner: null,
    diceRoll: null,
    hasRolled: false,
    consecutiveSixes: 0,
    message: 'Game started! Waiting for roll.',
    lastAction: null,
  };
};

const getAbsolutePos = (color, pos) => {
  if (pos < 0 || pos > 51) return null;
  return (pos + START_OFFSETS[color]) % 52;
};

// Check if a specific absolute position has a blockade (2+ tokens of the SAME color)
const isBlockade = (state, absolutePos) => {
  if (absolutePos === null) return false;
  
  for (const player of state.players) {
    let count = 0;
    for (const token of player.tokens) {
      if (token.position >= 0 && token.position <= 51) {
        if (getAbsolutePos(player.color, token.position) === absolutePos) {
          count++;
        }
      }
    }
    if (count >= 2) return true;
  }
  return false;
};

const getLegalMoves = (state, player, roll) => {
  const legalTokens = [];
  
  for (const token of player.tokens) {
    if (token.position === 57) continue; // Finished

    if (token.position === -1) {
      // Rule: Roll 6 to leave base
      if (roll === 6) legalTokens.push(token.id);
      continue;
    }

    const targetPos = token.position + roll;
    
    // Rule: Must be exact roll to finish
    if (targetPos > 57) continue;

    // Rule: Check for blockades along the path (Main board only)
    let blocked = false;
    for (let step = token.position + 1; step <= Math.min(targetPos, 51); step++) {
      const absStep = getAbsolutePos(player.color, step);
      if (isBlockade(state, absStep)) {
        blocked = true;
        break;
      }
    }

    if (!blocked) legalTokens.push(token.id);
  }
  
  return legalTokens;
};

const endTurn = (state) => {
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  state.hasRolled = false;
  state.diceRoll = null;
  state.consecutiveSixes = 0;
};

export const rollLudoDice = (state, playerId) => {
  if (state.status !== 'playing') return { ok: false, error: 'Game is over' };
  
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) return { ok: false, error: 'Not your turn' };
  if (state.hasRolled) return { ok: false, error: 'Already rolled, must move a token' };

  const roll = Math.floor(Math.random() * 6) + 1;
  state.diceRoll = roll;
  state.hasRolled = true;
  state.message = `${currentPlayer.name} rolled a ${roll}.`;

  if (roll === 6) {
    state.consecutiveSixes += 1;
    if (state.consecutiveSixes === 3) {
      state.message = `${currentPlayer.name} rolled three 6s in a row! Turn forfeited.`;
      endTurn(state);
      return { ok: true, state };
    }
  } else {
    state.consecutiveSixes = 0; // Reset if not a 6
  }

  const legalMoves = getLegalMoves(state, currentPlayer, roll);
  
  if (legalMoves.length === 0) {
    state.message = `${currentPlayer.name} rolled a ${roll} but has no legal moves.`;
    // If they rolled a 6 but can't move, they still get their extra turn
    if (roll !== 6) {
      endTurn(state);
    } else {
      state.hasRolled = false; // Allow them to roll again
    }
  }

  return { ok: true, state, legalMoves };
};

export const moveLudoToken = (state, playerId, tokenId) => {
  if (state.status !== 'playing') return { ok: false, error: 'Game is over' };
  
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) return { ok: false, error: 'Not your turn' };
  if (!state.hasRolled) return { ok: false, error: 'Must roll dice first' };

  const legalMoves = getLegalMoves(state, currentPlayer, state.diceRoll);
  if (!legalMoves.includes(tokenId)) return { ok: false, error: 'Illegal move' };

  const token = currentPlayer.tokens.find(t => t.id === tokenId);
  let extraTurn = state.diceRoll === 6;
  let captured = false;

  if (token.position === -1) {
    // Coming out of base
    token.position = 0;
    state.message = `${currentPlayer.name} released a token to the start.`;
  } else {
    token.position += state.diceRoll;
    state.message = `${currentPlayer.name} moved a token ${state.diceRoll} spaces.`;

    // Check Capture (Only on main board)
    if (token.position <= 51) {
      const absPos = getAbsolutePos(currentPlayer.color, token.position);
      
      if (!SAFE_SQUARES.includes(absPos)) {
        for (const opp of state.players) {
          if (opp.id === currentPlayer.id) continue;
          
          let tokensOnSquare = opp.tokens.filter(t => 
            t.position >= 0 && t.position <= 51 && getAbsolutePos(opp.color, t.position) === absPos
          );

          // Capture occurs if there is exactly 1 opponent token (not a blockade)
          if (tokensOnSquare.length === 1) {
            tokensOnSquare[0].position = -1; // Send back to base
            captured = true;
            extraTurn = true;
            state.message = `${currentPlayer.name} captured ${opp.name}'s token! Extra turn granted.`;
          }
        }
      }
    }
  }

  // Check finished condition
  if (token.position === 57) {
    currentPlayer.finishedCount += 1;
    state.message = `${currentPlayer.name} got a token home!`;
    
    // Win Condition
    if (currentPlayer.finishedCount === 4) {
      state.status = 'won';
      state.winner = currentPlayer;
      state.message = `${currentPlayer.name} has won the game! 🎉`;
      return { ok: true, state };
    }
  }

  // Handle turn passing
  if (extraTurn || captured) {
    state.hasRolled = false; // Player goes again
    state.diceRoll = null;
  } else {
    endTurn(state);
  }

  return { ok: true, state };
};

export const serializeLudoState = (state) => state;