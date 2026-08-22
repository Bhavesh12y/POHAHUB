const ROLES = {
  RAJA: { name: 'Raja', points: 1000, emoji: '👑', color: '#facc15' },
  MANTRI: { name: 'Mantri', points: 800, emoji: '📜', color: '#38bdf8' },
  SIPAHI: { name: 'Sipahi', points: 500, emoji: '⚔️', color: '#4ade80' },
  CHOR: { name: 'Chor', points: 0, emoji: '🦹', color: '#f87171' }
};

const TOTAL_ROUNDS = 5;

export function createRajaMantriState(players, previousStartingIndex = null) {
  const scores = {};
  players.forEach(p => {
    scores[p.id] = 0;
  });

  return {
    gameType: 'raja-mantri',
    status: 'playing', // 'playing' or 'finished'
    currentRound: 1,
    totalRounds: TOTAL_ROUNDS,
    roundPhase: 'revealing', // 'revealing', 'raja_call', 'mantri_call', 'mantri_guess', 'round_result'
    scores,
    roundRoles: {}, // playerId -> roleName
    roundPoints: {}, // playerId -> points earned in this round
    rajaId: null,
    mantriId: null,
    chorId: null,
    sipahiId: null,
    mantriGuessId: null,
    isGuessCorrect: null,
    winner: null
  };
}

export function startNewRound(gameState, players) {
  // Shuffle roles among the 4 players
  const rolePool = ['RAJA', 'MANTRI', 'SIPAHI', 'CHOR'];
  const shuffledRoles = [...rolePool].sort(() => Math.random() - 0.5);

  const roundRoles = {};
  let rajaId = null;
  let mantriId = null;
  let chorId = null;
  let sipahiId = null;

  players.forEach((p, idx) => {
    const role = shuffledRoles[idx];
    roundRoles[p.id] = role;
    if (role === 'RAJA') rajaId = p.id;
    if (role === 'MANTRI') mantriId = p.id;
    if (role === 'CHOR') chorId = p.id;
    if (role === 'SIPAHI') sipahiId = p.id;
  });

  gameState.roundRoles = roundRoles;
  gameState.rajaId = rajaId;
  gameState.mantriId = mantriId;
  gameState.chorId = chorId;
  gameState.sipahiId = sipahiId;
  gameState.roundPhase = 'revealing';
  gameState.mantriGuessId = null;
  gameState.isGuessCorrect = null;
  gameState.roundPoints = {};

  return gameState;
}

export function applyRajaMantriAction(gameState, playerId, action, payload = {}, players = []) {
  if (gameState.status !== 'playing') {
    return { ok: false, error: 'Game is not in active play' };
  }

  // 1. Raja calls for Mantri
  if (action === 'raja_call') {
    if (playerId !== gameState.rajaId) {
      return { ok: false, error: 'Only the Raja can call for the Mantri' };
    }
    gameState.roundPhase = 'mantri_call';
    return { ok: true, state: gameState };
  }

  // 2. Mantri reveals themselves
  if (action === 'mantri_reveal') {
    if (playerId !== gameState.mantriId) {
      return { ok: false, error: 'Only the Mantri can identify themselves' };
    }
    gameState.roundPhase = 'mantri_guess';
    return { ok: true, state: gameState };
  }

  // 3. Mantri guesses the Chor among the other 2 players
  if (action === 'mantri_guess') {
    if (playerId !== gameState.mantriId) {
      return { ok: false, error: 'Only the Mantri can make the suspect guess' };
    }
    const { suspectId } = payload;
    if (!suspectId || suspectId === gameState.rajaId || suspectId === gameState.mantriId) {
      return { ok: false, error: 'Invalid suspect selection' };
    }

    gameState.mantriGuessId = suspectId;
    const isCorrect = suspectId === gameState.chorId;
    gameState.isGuessCorrect = isCorrect;

    // Point distribution:
    // Raja always gets 1000, Sipahi always gets 500
    // If Mantri correct: Mantri gets 800, Chor gets 0
    // If Mantri wrong: Chor steals Mantri points (Chor gets 800, Mantri gets 0)
    const roundPoints = {};
    roundPoints[gameState.rajaId] = ROLES.RAJA.points;
    roundPoints[gameState.sipahiId] = ROLES.SIPAHI.points;

    if (isCorrect) {
      roundPoints[gameState.mantriId] = ROLES.MANTRI.points;
      roundPoints[gameState.chorId] = ROLES.CHOR.points;
    } else {
      roundPoints[gameState.mantriId] = 0;
      roundPoints[gameState.chorId] = ROLES.MANTRI.points;
    }

    gameState.roundPoints = roundPoints;

    // Add to cumulative scores
    Object.entries(roundPoints).forEach(([pId, pts]) => {
      gameState.scores[pId] = (gameState.scores[pId] || 0) + pts;
    });

    gameState.roundPhase = 'round_result';

    // If reached 5 rounds, finish game
    if (gameState.currentRound >= gameState.totalRounds) {
      gameState.status = 'finished';
      // Determine overall winner
      let highestScore = -1;
      let winnerId = null;
      Object.entries(gameState.scores).forEach(([pId, score]) => {
        if (score > highestScore) {
          highestScore = score;
          winnerId = pId;
        }
      });
      gameState.winner = winnerId;
    }

    return { ok: true, state: gameState };
  }

  // 4. Next Round
  if (action === 'next_round') {
    if (gameState.currentRound < gameState.totalRounds) {
      gameState.currentRound += 1;
      startNewRound(gameState, players);
      return { ok: true, state: gameState };
    } else {
      gameState.status = 'finished';
      return { ok: true, state: gameState };
    }
  }

  return { ok: false, error: 'Unknown action' };
}

export function checkAndExecuteRajaMantriBotTurn(gameState, players = []) {
  if (gameState.status !== 'playing') return null;

  // 1. If Raja is a bot and in 'revealing' phase
  const rajaPlayer = players.find(p => p.id === gameState.rajaId);
  if (rajaPlayer?.isBot && gameState.roundPhase === 'revealing') {
    gameState.roundPhase = 'mantri_call';
    return { changed: true };
  }

  // 2. If Mantri is a bot and in 'mantri_call' phase
  const mantriPlayer = players.find(p => p.id === gameState.mantriId);
  if (mantriPlayer?.isBot && gameState.roundPhase === 'mantri_call') {
    gameState.roundPhase = 'mantri_guess';
    return { changed: true };
  }

  // 3. If Mantri is a bot and in 'mantri_guess' phase
  if (mantriPlayer?.isBot && gameState.roundPhase === 'mantri_guess') {
    // Suspect candidates: Chor and Sipahi
    const candidates = [gameState.chorId, gameState.sipahiId].filter(Boolean);
    const chosenSuspect = candidates[Math.floor(Math.random() * candidates.length)];
    if (chosenSuspect) {
      applyRajaMantriAction(gameState, gameState.mantriId, 'mantri_guess', { suspectId: chosenSuspect }, players);
      return { changed: true };
    }
  }

  return null;
}

