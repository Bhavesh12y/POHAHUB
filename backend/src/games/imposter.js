const WORD_PACKS = [
  { category: 'Food & Drinks', words: ['Pizza', 'Burger', 'Biryani', 'Samosa', 'Ice Cream', 'Coffee', 'Chocolate', 'Pasta', 'Pancake', 'Taco', 'Noodles', 'Dosa'] },
  { category: 'Animals', words: ['Lion', 'Elephant', 'Penguin', 'Monkey', 'Giraffe', 'Kangaroo', 'Dolphin', 'Tiger', 'Panda', 'Zebra', 'Cheetah', 'Octopus'] },
  { category: 'Places', words: ['Airport', 'Hospital', 'Cinema', 'School', 'Beach', 'Museum', 'Library', 'Amusement Park', 'Hotel', 'Stadium', 'Zoo', 'Castle'] },
  { category: 'Objects', words: ['Guitar', 'Smartphone', 'Umbrella', 'Bicycle', 'Headphones', 'Camera', 'Telescope', 'Backpack', 'Wristwatch', 'Mirror', 'Flashlight'] },
  { category: 'Sports & Games', words: ['Cricket', 'Football', 'Chess', 'Basketball', 'Tennis', 'Badminton', 'Swimming', 'Bowling', 'Archery', 'Boxing', 'Hockey'] },
  { category: 'Professions', words: ['Doctor', 'Pilot', 'Chef', 'Astronaut', 'Detective', 'Firefighter', 'Magician', 'Artist', 'Teacher', 'Scientist', 'Soldier'] }
];

const MAX_IMPOSTER_ATTEMPTS = 3;

export function createImposterState(players, previousStartingIndex = null) {
  const scores = {};
  players.forEach(p => {
    scores[p.id] = 0;
  });

  const state = {
    gameType: 'imposter',
    status: 'playing', // 'playing' or 'finished'
    clueRound: 1, // 1 or 2 (exactly 2 rounds of clues before voting)
    totalClueRounds: 2,
    roundPhase: 'word_reveal', // 'word_reveal', 'clue_phase', 'voting', 'game_over'
    category: '',
    secretWord: '',
    imposterId: null,
    clueOrder: [],
    currentClueIndex: 0,
    round1Clues: [], // { playerId, playerName, clue }
    round2Clues: [], // { playerId, playerName, clue }
    imposterAttemptsLeft: MAX_IMPOSTER_ATTEMPTS,
    imposterGuesses: [], // history of guesses tried
    imposterInstantWin: false,
    imposterFailedAllAttempts: false,
    votes: {}, // voterId -> targetPlayerId
    voteResults: {},
    caughtImposter: false,
    winnerTeam: null, // 'detectives' or 'imposter'
    scores
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
  gameState.clueRound = 1;
  gameState.totalClueRounds = 2;
  gameState.round1Clues = [];
  gameState.round2Clues = [];
  gameState.imposterAttemptsLeft = MAX_IMPOSTER_ATTEMPTS;
  gameState.imposterGuesses = [];
  gameState.imposterInstantWin = false;
  gameState.imposterFailedAllAttempts = false;
  gameState.votes = {};
  gameState.voteResults = {};
  gameState.caughtImposter = false;
  gameState.winnerTeam = null;
  gameState.roundPhase = 'word_reveal';

  return gameState;
}

export function applyImposterAction(gameState, playerId, action, payload = {}, players = []) {
  if (gameState.status !== 'playing') {
    return { ok: false, error: 'Game is not in active play' };
  }

  // A. PARALLEL ANYTIME IMPOSTER GUESS (3 ATTEMPTS)
  if (action === 'imposter_guess_word') {
    if (playerId !== gameState.imposterId) {
      return { ok: false, error: 'Only the Imposter can attempt to guess the secret word' };
    }
    if (gameState.imposterAttemptsLeft <= 0) {
      return { ok: false, error: 'No guess attempts remaining' };
    }

    const rawGuess = (payload.guess || '').trim();
    if (!rawGuess) return { ok: false, error: 'Guess cannot be empty' };

    const guess = rawGuess.toLowerCase();
    const target = gameState.secretWord.toLowerCase();
    const isMatch = guess === target || (guess.length >= 3 && target.includes(guess));

    gameState.imposterGuesses.push(rawGuess);

    if (isMatch) {
      // Imposter wins instantly!
      gameState.imposterInstantWin = true;
      gameState.winnerTeam = 'imposter';
      gameState.scores[gameState.imposterId] = (gameState.scores[gameState.imposterId] || 0) + 500;
      gameState.roundPhase = 'game_over';
      gameState.status = 'finished';
      return { ok: true, state: gameState };
    } else {
      // Deduct 1 attempt
      gameState.imposterAttemptsLeft -= 1;
      if (gameState.imposterAttemptsLeft <= 0) {
        // Imposter lost all attempts -> Detectives win instantly!
        gameState.imposterFailedAllAttempts = true;
        gameState.winnerTeam = 'detectives';
        players.forEach(p => {
          if (p.id !== gameState.imposterId) {
            gameState.scores[p.id] = (gameState.scores[p.id] || 0) + 300;
          }
        });
        gameState.roundPhase = 'game_over';
        gameState.status = 'finished';
      }
      return { ok: true, state: gameState };
    }
  }

  // 1. Ready from Word Reveal -> Clue Phase (Round 1)
  if (action === 'start_clues') {
    gameState.roundPhase = 'clue_phase';
    gameState.clueRound = 1;
    gameState.currentClueIndex = 0;
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

    const clueText = (payload.clue || '').trim().split(' ')[0];
    if (!clueText) return { ok: false, error: 'Clue cannot be empty' };

    const playerObj = players.find(p => p.id === playerId);
    const clueObj = {
      playerId,
      playerName: playerObj?.name || 'Player',
      clue: clueText,
      timestamp: Date.now()
    };

    if (gameState.clueRound === 1) {
      gameState.round1Clues.push(clueObj);
    } else {
      gameState.round2Clues.push(clueObj);
    }

    gameState.currentClueIndex += 1;

    // Check if current clue round is complete
    if (gameState.currentClueIndex >= gameState.clueOrder.length) {
      if (gameState.clueRound === 1) {
        // Move to Round 2 of clues
        gameState.clueRound = 2;
        gameState.currentClueIndex = 0;
      } else {
        // Both 2 rounds of clues finished -> Open Voting Phase!
        gameState.roundPhase = 'voting';
        gameState.votes = {};
      }
    }

    return { ok: true, state: gameState };
  }

  // 3. Cast Vote
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
        // Majority voted for Imposter -> Imposter loses, Detectives win!
        gameState.winnerTeam = 'detectives';
        players.forEach(p => {
          if (p.id !== gameState.imposterId) {
            gameState.scores[p.id] = (gameState.scores[p.id] || 0) + 300;
          }
        });
      } else {
        // Majority failed to identify Imposter -> Imposter wins!
        gameState.winnerTeam = 'imposter';
        gameState.scores[gameState.imposterId] = (gameState.scores[gameState.imposterId] || 0) + 400;
      }

      gameState.roundPhase = 'game_over';
      gameState.status = 'finished';
    }

    return { ok: true, state: gameState };
  }

  return { ok: false, error: 'Unknown action' };
}
