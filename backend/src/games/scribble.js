import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// --- YOUR PUBLISHED GOOGLE SHEET LINK ---
const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSktbZaUpHjnxmV8iMjXTc-NrcknJl7EaWJPhHw4z1blDlwKTissKkzflUyunBEPpnFwtpw33zGrgBb/pub?output=csv';

// --- FALLBACK WORDS ---
let WORDS = [
  'APPLE', 'ASTRONAUT', 'BACKPACK', 'BANANA', 'BICYCLE', 'BUTTERFLY', 'CAMERA', 'CASTLE', 
  'COMPASS', 'COMPUTER', 'DIAMOND', 'DRAGON', 'ELEPHANT', 'FIRETRUCK', 'GUITAR', 'HAMBURGER'
];

// --- AUTO-FETCHER ---
async function fetchWordsFromGoogleSheet() {
  try {
    const response = await fetch(GOOGLE_SHEET_CSV_URL);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const csvText = await response.text();
    
    const sheetWords = csvText
      .split('\n')
      .map(word => word.replace(/,/g, '').trim().toUpperCase())
      .filter(word => word.length > 0);

    if (sheetWords.length > 0) {
      WORDS = sheetWords;
      console.log(`✅ [Scribble] Successfully loaded ${WORDS.length} words from Google Sheets!`);
    }
  } catch (error) {
    console.error('❌ [Scribble] Failed to fetch words from Google Sheet. Using fallback list.', error.message);
  }
}

fetchWordsFromGoogleSheet();
setInterval(fetchWordsFromGoogleSheet, 3600000);

function getThreeRandomWords() {
  return [...WORDS].sort(() => 0.5 - Math.random()).slice(0, 3);
}

// --- GAME STATE LOGIC ---
export function createScribbleState(players) {
  const startIndex = Math.floor(Math.random() * players.length);

  return {
    status: 'playing',
    players: players.map((p) => ({ id: p.id, name: p.name, score: 0 })),
    drawerIndex: startIndex,
    drawerId: players[startIndex].id,
    round: 1,
    maxRounds: 3,
    turnState: 'selecting',
    wordOptions: getThreeRandomWords(),
    currentWord: '',
    lastWord: '',                     // ← NEW: to reveal after time runs out
    guessedPlayers: [],
    hints: [],
    hintsRevealed: 0,
    startTime: 0,
    timeLimit: 60,
  };
}

export function revealHint(state) {
  const wordLen = state.currentWord.length;
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
  // Keep the word for the “time’s up” pop‑up
  state.lastWord = state.currentWord;

  state.drawerIndex++;
  if (state.drawerIndex >= state.players.length) {
    state.drawerIndex = 0;
    state.round++;
  }

  if (state.round > state.maxRounds) {
    state.status = 'won';
    state.winner = [...state.players].sort((a, b) => b.score - a.score)[0];
  } else {
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
    lastWord: state.lastWord || '',    // ← NEW: revealed after turn ends
    startTime: state.startTime,
    timeLimit: state.timeLimit,
    winner: state.winner,
    guessedPlayers: state.guessedPlayers
  };
}

// --- NEW: Levenshtein distance for “close” guesses ---
function levenshtein(a, b) {
  const an = a.length;
  const bn = b.length;
  const matrix = [];

  for (let i = 0; i <= bn; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= an; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }
  return matrix[bn][an];
}

/**
 * Check a guess against the real word.
 * Returns { result: 'correct' | 'close' | 'wrong', message }
 */
export function checkGuess(guess, currentWord, playerName) {
  const normGuess = guess.trim().toUpperCase();
  const normWord = currentWord.toUpperCase();

  if (normGuess === normWord) {
    return { result: 'correct', message: `${playerName} guessed the word! 🎉` };
  }

  const distance = levenshtein(normGuess, normWord);
  // “very close” = max 1 letter difference (and lengths not wildly different)
  if (distance <= 2 && Math.abs(normGuess.length - normWord.length) <= 1) {
    return { result: 'close', message: `So close, ${playerName}! You're almost there.` };
  }

  return { result: 'wrong', message: '' };
}