import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Robust fallback list to fix the "no words coming in" bug
let WORDS = [
  'APPLE', 'ASTRONAUT', 'BACKPACK', 'BANANA', 'BICYCLE', 'BUTTERFLY', 'CAMERA', 'CASTLE', 
  'COMPASS', 'COMPUTER', 'DIAMOND', 'DRAGON', 'ELEPHANT', 'FIRETRUCK', 'GUITAR', 'HAMBURGER', 
  'HELICOPTER', 'IGLOO', 'KANGAROO', 'LIGHTHOUSE', 'MICROSCOPE', 'MOUNTAIN', 'OCEAN', 
  'PENGUIN', 'PIZZA', 'PYRAMID', 'ROCKET', 'SATELLITE', 'SNOWMAN', 'SPIDER', 'SUNFLOWER', 
  'TELESCOPE', 'TIGER', 'TORNADO', 'UMBRELLA', 'VOLCANO', 'WATERFALL', 'WIZARD', 'ZEBRA'
];

try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const wordsData = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/words.json'), 'utf8'));
  if (Array.isArray(wordsData)) WORDS = wordsData;
  else if (wordsData.words) WORDS = wordsData.words;
} catch (e) {
  console.log('Words file not found or invalid, using robust fallback list.');
}

function getThreeRandomWords() {
  return [...WORDS].sort(() => 0.5 - Math.random()).slice(0, 3);
}

export function createScribbleState(players) {
  return {
    status: 'playing',
    players: players.map((p) => ({ id: p.id, name: p.name, score: 0 })),
    drawerIndex: 0,
    drawerId: players[0].id,
    round: 1,
    maxRounds: 3,
    turnState: 'selecting', // 'selecting' or 'drawing'
    wordOptions: getThreeRandomWords(),
    currentWord: '',
    guessedPlayers: [],
    hints: [], // Array of revealed indices
    hintsRevealed: 0,
    startTime: 0,
    timeLimit: 60, // 60 seconds to draw
  };
}

export function revealHint(state) {
  const wordLen = state.currentWord.length;
  // Find indices that haven't been revealed yet
  const unrevealed = [];
  for (let i = 0; i < wordLen; i++) {
    if (state.currentWord[i] !== ' ' && !state.hints.includes(i)) unrevealed.push(i);
  }
  if (unrevealed.length > 0) {
    const randomIndex = unrevealed[Math.floor(Math.random() * unrevealed.length)];
    state.hints.push(randomIndex);
    state.hintsRevealed++;
  }
}

export function endScribbleTurn(state) {
  state.drawerIndex++;
  
  // If everyone has drawn, move to the next round
  if (state.drawerIndex >= state.players.length) {
    state.drawerIndex = 0;
    state.round++;
  }

  // End game after 3 rounds
  if (state.round > state.maxRounds) {
    state.status = 'won';
    state.winner = [...state.players].sort((a, b) => b.score - a.score)[0];
  } else {
    // Setup next turn
    state.turnState = 'selecting';
    state.drawerId = state.players[state.drawerIndex].id;
    state.wordOptions = getThreeRandomWords();
    state.currentWord = '';
    state.guessedPlayers = [];
    state.hints = [];
    state.hintsRevealed = 0;
    state.startTime = 0;
  }
}

export function serializeScribbleState(state, viewerId) {
  const isDrawer = viewerId === state.drawerId;
  const isGameOver = state.status === 'won';

  let displayWord = state.currentWord;
  let sentWordOptions = [];

  // Hide the word and options from guessers
  if (!isDrawer && !isGameOver) {
    sentWordOptions = [];
    if (state.turnState === 'drawing') {
      displayWord = state.currentWord.split('').map((char, index) => {
        if (char === ' ') return '  ';
        return state.hints.includes(index) ? char : '_';
      }).join(' ');
    } else {
      displayWord = '';
    }
  } else {
    sentWordOptions = state.wordOptions;
  }

  return {
    status: state.status,
    players: state.players,
    drawerId: state.drawerId,
    round: state.round,
    maxRounds: state.maxRounds,
    turnState: state.turnState,
    wordOptions: sentWordOptions,
    currentWord: displayWord,
    startTime: state.startTime,
    timeLimit: state.timeLimit,
    winner: state.winner,
    guessedPlayers: state.guessedPlayers
  };
}