const WORD_PACKS = [
  { category: 'Food & Drinks', words: ['Pizza', 'Burger', 'Biryani', 'Samosa', 'Ice Cream', 'Coffee', 'Chocolate', 'Pasta', 'Pancake', 'Taco'] },
  { category: 'Animals', words: ['Lion', 'Elephant', 'Penguin', 'Monkey', 'Giraffe', 'Kangaroo', 'Dolphin', 'Tiger', 'Panda', 'Zebra'] },
  { category: 'Places', words: ['Airport', 'Hospital', 'Cinema', 'School', 'Beach', 'Museum', 'Library', 'Amusement Park', 'Hotel', 'Stadium'] },
  { category: 'Objects', words: ['Guitar', 'Smartphone', 'Umbrella', 'Bicycle', 'Headphones', 'Camera', 'Telescope', 'Backpack', 'Wristwatch', 'Mirror'] },
  { category: 'Sports & Games', words: ['Cricket', 'Football', 'Chess', 'Basketball', 'Tennis', 'Badminton', 'Swimming', 'Bowling', 'Archery', 'Boxing'] },
  { category: 'Professions', words: ['Doctor', 'Pilot', 'Chef', 'Astronaut', 'Detective', 'Firefighter', 'Magician', 'Artist', 'Teacher', 'Scientist'] }
];

const TOTAL_ROUNDS = 3;
const CLUE_TIMER_SEC = 20;

export function createImposterState(players, previousStartingIndex = null) {
  const scores = {};
  players.forEach(p => {
    scores[p.id] = 0;
  });

  const state = {
    gameType: 'imposter',
    status: 'playing', // 'playing' or 'finished'
    currentRound: 1,
    totalRounds: TOTAL_ROUNDS,
    roundPhase: 'word_reveal', // 'word_reveal', 'clue_phase', 'discussion', 'voting', 'imposter_guess', 'round_result'
    category: '',
    secretWord: '',
    imposterId: null,
    clueOrder: [],
    currentClueIndex: 0,
    clues: [], // { playerId, playerName, clue, timestamp }
    clueTimer: CLUE_TIMER_SEC,
    votes: {}, // voterId -> targetPlayerId
    voteResults: {},
    caughtImposter: false,
    imposterStealGuess: '',
    imposterStealSuccess: false,
    scores,
    winner: null
  };

  return startNewImposterRound(state, players);
}

export function startNewImposterRound(gameState, players) {
  // Pick random category and word
  const pack = WORD_PACKS[Math.floor(Math.random() * WORD_PACKS.length)];
  const word = pack.words[Math.floor(Math.random() * pack.words.length)];

  // Pick random imposter
  const imposterIndex = Math.floor(Math.random() * players.length);
  const imposterId = players[imposterIndex].id;

  // Shuffle clue giving turn order
  const clueOrder = players.map(p => p.id).sort(() => Math.random() - 0.5);

  gameState.category = pack.category;
  gameState.secretWord = word;
  gameState.imposterId = imposterId;
  gameState.clueOrder = clueOrder;
  gameState.currentClueIndex = 0;
  gameState.clues = [];
  gameState.clueTimer = CLUE_TIMER_SEC;
  gameState.votes = {};
  gameState.voteResults = {};
  gameState.caughtImposter = false;
  gameState.imposterStealGuess = '';
  gameState.imposterStealSuccess = false;
  gameState.roundPhase = 'word_reveal';

  return gameState;
}

export function applyImposterAction(gameState, playerId, action, payload = {}, players = []) {
  if (gameState.status !== 'playing') {
    return { ok: false, error: 'Game is not in active play' };
  }

  // 1. Ready from Word Reveal -> Clue Phase
  if (action === 'start_clues') {
    gameState.roundPhase = 'clue_phase';
    gameState.currentClueIndex = 0;
    gameState.clueTimer = CLUE_TIMER_SEC;
    return { ok: true, state: gameState };
  }

  // 2. Submit Clue (1-word clue)
  if (action === 'submit_clue') {
    if (gameState.roundPhase !== 'clue_phase') {
      return { ok: false, error: 'Not in clue phase' };
    }
    const activePlayerId = gameState.clueOrder[gameState.currentClueIndex];
    if (playerId !== activePlayerId) {
      return { ok: false, error: 'Not your turn to give a clue' };
    }

    const clueText = (payload.clue || '').trim();
    if (!clueText) {
      return { ok: false, error: 'Clue cannot be empty' };
    }

    const playerObj = players.find(p => p.id === playerId);
    gameState.clues.push({
      playerId,
      playerName: playerObj?.name || 'Player',
      clue: clueText,
      timestamp: Date.now()
    });

    gameState.currentClueIndex += 1;
    gameState.clueTimer = CLUE_TIMER_SEC;

    // Check if all players gave clues
    if (gameState.currentClueIndex >= gameState.clueOrder.length) {
      gameState.roundPhase = 'discussion';
    }

    return { ok: true, state: gameState };
  }

  // 3. Move from Discussion to Voting
  if (action === 'start_voting') {
    gameState.roundPhase = 'voting';
    gameState.votes = {};
    return { ok: true, state: gameState };
  }

  // 4. Cast Vote
  if (action === 'cast_vote') {
    if (gameState.roundPhase !== 'voting') {
      return { ok: false, error: 'Not in voting phase' };
    }
    const { targetPlayerId } = payload;
    if (!targetPlayerId || targetPlayerId === playerId) {
      return { ok: false, error: 'Invalid vote target' };
    }

    gameState.votes[playerId] = targetPlayerId;

    // Check if all players have voted
    if (Object.keys(gameState.votes).length >= players.length) {
      // Calculate vote counts
      const tally = {};
      Object.values(gameState.votes).forEach(tId => {
        tally[tId] = (tally[tId] || 0) + 1;
      });

      let maxVotes = 0;
      let suspectId = null;
      let isTie = false;

      Object.entries(tally).forEach(([tId, count]) => {
        if (count > maxVotes) {
          maxVotes = count;
          suspectId = tId;
          isTie = false;
        } else if (count === maxVotes) {
          isTie = true;
        }
      });

      gameState.voteResults = tally;
      const isImposterCaught = !isTie && suspectId === gameState.imposterId;
      gameState.caughtImposter = isImposterCaught;

      if (isImposterCaught) {
        // Imposter gets one final chance to guess the secret word and steal the victory
        gameState.roundPhase = 'imposter_guess';
      } else {
        // Imposter got away!
        gameState.scores[gameState.imposterId] = (gameState.scores[gameState.imposterId] || 0) + 400;
        gameState.roundPhase = 'round_result';
        checkGameEnd(gameState);
      }
    }

    return { ok: true, state: gameState };
  }

  // 5. Imposter Word Steal Guess
  if (action === 'imposter_steal_guess') {
    if (playerId !== gameState.imposterId || gameState.roundPhase !== 'imposter_guess') {
      return { ok: false, error: 'Only the Imposter can attempt word steal' };
    }

    const guess = (payload.guess || '').trim().toLowerCase();
    const target = gameState.secretWord.toLowerCase();
    gameState.imposterStealGuess = payload.guess;

    const isSuccess = guess.includes(target) || target.includes(guess);
    gameState.imposterStealSuccess = isSuccess;

    if (isSuccess) {
      // Imposter successfully stole the win!
      gameState.scores[gameState.imposterId] = (gameState.scores[gameState.imposterId] || 0) + 500;
    } else {
      // Detectives win! All non-imposters get points
      players.forEach(p => {
        if (p.id !== gameState.imposterId) {
          gameState.scores[p.id] = (gameState.scores[p.id] || 0) + 300;
        }
      });
    }

    gameState.roundPhase = 'round_result';
    checkGameEnd(gameState);
    return { ok: true, state: gameState };
  }

  // 6. Next Round
  if (action === 'next_round') {
    if (gameState.currentRound < gameState.totalRounds) {
      gameState.currentRound += 1;
      startNewImposterRound(gameState, players);
      return { ok: true, state: gameState };
    } else {
      gameState.status = 'finished';
      return { ok: true, state: gameState };
    }
  }

  return { ok: false, error: 'Unknown action' };
}

function checkGameEnd(gameState) {
  if (gameState.currentRound >= gameState.totalRounds) {
    gameState.status = 'finished';
    let maxScore = -1;
    let winnerId = null;
    Object.entries(gameState.scores).forEach(([pId, score]) => {
      if (score > maxScore) {
        maxScore = score;
        winnerId = pId;
      }
    });
    gameState.winner = winnerId;
  }
}
