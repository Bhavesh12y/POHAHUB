import WORDS from '../data/words.json' assert { type: 'json' };

function getRandomWord() {
  return WORDS[Math.floor(Math.random() * WORDS.length)];
}

export function createScribbleState(players) {
  return {
    status: 'playing',
    players: players.map((p) => ({ id: p.id, name: p.name, score: 0 })),
    drawerIndex: 0,
    drawerId: players[0].id,
    currentWord: getRandomWord(),
    turn: 1,
    maxTurns: players.length * 3, // Play 3 rounds per person
  };
}

export function nextScribbleTurn(state) {
  state.turn++;
  
  if (state.turn > state.maxTurns) {
    state.status = 'won'; // Game over
    // Find the player with the highest score
    state.winner = [...state.players].sort((a, b) => b.score - a.score)[0];
    return;
  }
  
  // Pass the brush to the next player
  state.drawerIndex = (state.drawerIndex + 1) % state.players.length;
  state.drawerId = state.players[state.drawerIndex].id;
  state.currentWord = getRandomWord();
}

export function serializeScribbleState(state, viewerId) {
  const isDrawer = viewerId === state.drawerId;
  const isGameOver = state.status === 'won';

  // If you aren't drawing, hide the word with underscores (e.g., A P P L E -> _ _ _ _ _)
  let displayWord = state.currentWord;
  if (!isDrawer && !isGameOver) {
    displayWord = state.currentWord.split('').map(() => '_').join(' ');
  }

  return {
    status: state.status,
    players: state.players,
    drawerId: state.drawerId,
    turn: state.turn,
    maxTurns: state.maxTurns,
    winner: state.winner,
    currentWord: displayWord,
  };
}