import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const GOOGLE_SHEET_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSktbZaUpHjnxmV8iMjXTc-NrcknJl7EaWJPhHw4z1blDlwKTissKkzflUyunBEPpnFwtpw33zGrgBb/pub?output=csv';

let WORDS = [
  'APPLE', 'ASTRONAUT', 'BACKPACK', 'BANANA', 'BICYCLE', 'BUTTERFLY', 'CAMERA', 'CASTLE', 
  'COMPASS', 'COMPUTER', 'DIAMOND', 'DRAGON', 'ELEPHANT', 'FIRETRUCK', 'GUITAR', 'HAMBURGER'
];

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
    }
  } catch (error) {
    console.error("Failed to fetch words from Google Sheet, using fallback:", error);
  }
}

// Fetch on startup
fetchWordsFromGoogleSheet();
setInterval(fetchWordsFromGoogleSheet, 1000 * 60 * 60);

// FIX 3: Utility to fetch random words for selection
export function getRandomWords(count) {
  const shuffled = [...WORDS].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

export function createScribbleState(players) {
  return {
    players: players.map(p => ({ ...p, score: 0 })),
    currentRound: 1,
    maxRounds: 3,
    turnState: 'selecting', 
    drawerId: players[0]?.id || null,
    currentWord: '',
    wordOptions: getRandomWords(3), // FIX 3: Initialize with words immediately
    guessedPlayers: [],
    startTime: 0,
    timeLimit: 80, 
    hintsRevealed: 0,
    history: [] 
  };
}

export function startScribbleTurn(state) {
  state.turnState = 'selecting';
  state.currentWord = '';
  state.wordOptions = getRandomWords(3);
  state.guessedPlayers = [];
  state.hintsRevealed = 0;
  state.history = [];
}

export function endScribbleTurn(state) {
  state.turnState = 'finished';
}

export function revealHint(state) {
  if (!state.currentWord || state.turnState !== 'drawing') return;
  
  if (!state.hint) {
    state.hint = state.currentWord.replace(/[a-zA-Z]/g, '_');
  }

  const wordArr = state.currentWord.split('');
  let hintArr = state.hint.split('');
  
  let hiddenIndices = [];
  for (let i = 0; i < hintArr.length; i++) {
    if (hintArr[i] === '_') hiddenIndices.push(i);
  }

  if (hiddenIndices.length > 1) {
    const randomIdx = hiddenIndices[Math.floor(Math.random() * hiddenIndices.length)];
    hintArr[randomIdx] = wordArr[randomIdx];
    state.hint = hintArr.join('');
    state.hintsRevealed++;
  }
}

export function serializeScribbleState(state, viewerId) {
  const isDrawer = state.drawerId === viewerId;
  const isFinished = state.turnState === 'finished';

  return {
    players: state.players,
    currentRound: state.currentRound,
    maxRounds: state.maxRounds,
    turnState: state.turnState,
    drawerId: state.drawerId,
    startTime: state.startTime,
    timeLimit: state.timeLimit,
    hintsRevealed: state.hintsRevealed,
    hint: state.hint,
    history: state.history,
    guessedPlayers: state.guessedPlayers,
    currentWord: (isDrawer || isFinished) ? state.currentWord : null,
    wordOptions: isDrawer && state.turnState === 'selecting' ? state.wordOptions : [],
  };
}

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
          matrix[i - 1][j - 1] + 1, 
          matrix[i][j - 1] + 1,     
          matrix[i - 1][j] + 1      
        );
      }
    }
  }
  return matrix[bn][an];
}

export function checkGuess(guess, currentWord, playerName) {
  const cleanGuess = guess.trim().toUpperCase();
  const cleanWord = currentWord.trim().toUpperCase();

  if (cleanGuess === cleanWord) {
    return { result: 'correct', message: `✅ ${playerName} guessed the word!` };
  }

  if (cleanGuess.length > 2 && levenshtein(cleanGuess, cleanWord) <= 2) {
    return { result: 'close', message: `🔥 '${guess}' is very close!` };
  }

  return { result: 'wrong', message: guess };
}