// backend/src/games/ludo.js

const LUDO_COLORS = ['#ef4444', '#22c55e', '#facc15', '#3b82f6']; 
const START_OFFSETS = { '#ef4444': 0, '#22c55e': 13, '#facc15': 26, '#3b82f6': 39 };
const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];

export const createLudoState = (players) => {
  return {
    players: players.map((p, i) => ({
      ...p,
      color: LUDO_COLORS[i % LUDO_COLORS.length],
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
    legalMoves: [], 
    consecutiveSixes: 0,
    message: 'Game started! Waiting for roll.',
    lastAction: null,
  };
};

const getAbsolutePos = (color, pos) => {
  if (pos < 0 || pos > 50) return null; 
  return (pos + START_OFFSETS[color]) % 52;
};

const getLegalMoves = (state, player, roll) => {
  const legalTokens = [];
  
  for (const token of player.tokens) {
    if (token.position === 56) continue; // Finished

    if (token.position === -1) {
      if (roll === 6) legalTokens.push(token.id);
      continue;
    }

    const targetPos = token.position + roll;
    if (targetPos > 56) continue; // Must be exact roll to finish

    // RULE 5 FIX: Blockade rule completely removed. Tokens can pass freely.
    legalTokens.push(token.id); 
  }
  
  return legalTokens;
};

const endTurn = (state) => {
  state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
  state.hasRolled = false;
  state.legalMoves = [];
  state.consecutiveSixes = 0;
};

export const rollLudoDice = (state, playerId) => {
  if (state.status !== 'playing') return { ok: false, error: 'Game is over' };
  
  const currentPlayer = state.players[state.currentPlayerIndex];
  if (currentPlayer.id !== playerId) return { ok: false, error: 'Not your turn' };
  if (state.hasRolled) return { ok: false, error: 'Already rolled' };

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
    state.consecutiveSixes = 0;
  }

  const legalMoves = getLegalMoves(state, currentPlayer, roll);
  state.legalMoves = legalMoves;
  
  if (legalMoves.length === 0) {
    state.message = `${currentPlayer.name} rolled a ${roll} but has no legal moves.`;
    if (roll !== 6) {
      endTurn(state);
    } else {
      state.hasRolled = false;
    }
  }

  return { ok: true, state };
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
    token.position = 0;
    state.message = `${currentPlayer.name} released a token to the start.`;
  } else {
    token.position += state.diceRoll;
    state.message = `${currentPlayer.name} moved a token ${state.diceRoll} spaces.`;

    if (token.position <= 50) {
      const absPos = getAbsolutePos(currentPlayer.color, token.position);
      
      if (!SAFE_SQUARES.includes(absPos)) {
        for (const opp of state.players) {
          if (opp.id === currentPlayer.id) continue;
          
          let tokensOnSquare = opp.tokens.filter(t => 
            t.position >= 0 && t.position <= 50 && getAbsolutePos(opp.color, t.position) === absPos
          );

          if (tokensOnSquare.length === 1) {
            tokensOnSquare[0].position = -1;
            captured = true;
            extraTurn = true;
            state.message = `${currentPlayer.name} captured ${opp.name}'s token! Extra turn granted.`;
          }
        }
      }
    }
  }

  if (token.position === 56) {
    currentPlayer.finishedCount += 1;
    extraTurn = true; // RULE 1 FIX: Grant extra turn when reaching inside home
    state.message = `${currentPlayer.name} got a token home! Extra turn granted.`;
    
    if (currentPlayer.finishedCount === 4) {
      state.status = 'won';
      state.winner = currentPlayer;
      state.message = `${currentPlayer.name} has won the game! 🎉`;
      return { ok: true, state };
    }
  }

  if (extraTurn || captured) {
    state.hasRolled = false;
    state.legalMoves = [];
  } else {
    endTurn(state);
  }

  return { ok: true, state };
};

export const serializeLudoState = (state) => state;