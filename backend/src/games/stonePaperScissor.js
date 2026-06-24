// backend/src/games/stonePaperScissor.js

export function createStonePaperScissorState(players, maxRounds = 3) {
  return {
    players: players.map((p) => ({ id: p.id, name: p.name, score: 0, currentChoice: null })),
    currentRound: 1,
    maxRounds,
    status: 'playing', // 'playing', 'round-result', 'won', 'draw'
    roundWinnerId: null, // id of round winner, or 'tie'
    winner: null,
  };
}

export function playSpsMove(state, playerId, choice) {
  if (state.status !== 'playing') return { ok: false, error: 'Round is over' };
  if (!['stone', 'paper', 'scissor'].includes(choice)) return { ok: false, error: 'Invalid choice' };

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, error: 'Player not found' };
  if (player.currentChoice) return { ok: false, error: 'Already made a choice this round' };

  player.currentChoice = choice;

  // If both players have made their choice, evaluate the round!
  const allMadeChoices = state.players.every((p) => p.currentChoice !== null);
  if (allMadeChoices) {
    evaluateRound(state);
  }

  return { ok: true };
}

function evaluateRound(state) {
  const p1 = state.players[0];
  const p2 = state.players[1];

  let winner = null;
  if (p1.currentChoice !== p2.currentChoice) {
    if (
      (p1.currentChoice === 'stone' && p2.currentChoice === 'scissor') ||
      (p1.currentChoice === 'paper' && p2.currentChoice === 'stone') ||
      (p1.currentChoice === 'scissor' && p2.currentChoice === 'paper')
    ) {
      winner = p1;
    } else {
      winner = p2;
    }
  }

  if (winner) {
    winner.score += 1;
    state.roundWinnerId = winner.id;
  } else {
    state.roundWinnerId = 'tie';
  }

  state.status = 'round-result';

  // Check if someone reached 2 wins (in a best of 3) or if it's the last round
  const winScore = Math.ceil(state.maxRounds / 2);
  if (p1.score >= winScore || p2.score >= winScore || state.currentRound >= state.maxRounds) {
    if (p1.score > p2.score) state.winner = p1;
    else if (p2.score > p1.score) state.winner = p2;

    state.status = p1.score === p2.score ? 'draw' : 'won';
  }
}

export function nextSpsRound(state) {
  if (state.status !== 'round-result') return { ok: false, error: 'Cannot start next round' };
  state.currentRound++;
  state.status = 'playing';
  state.roundWinnerId = null;
  state.players.forEach((p) => (p.currentChoice = null));
  return { ok: true };
}

export function serializeSpsState(state) {
  // Hide choices if the round is still actively playing so players can't cheat via devtools!
  const allMadeChoices = state.players.every((p) => p.currentChoice !== null);
  return {
    ...state,
    players: state.players.map((p) => ({
      ...p,
      currentChoice: allMadeChoices || state.status !== 'playing' ? p.currentChoice : p.currentChoice ? 'hidden' : null,
    })),
  };
}