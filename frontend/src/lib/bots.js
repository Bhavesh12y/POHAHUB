// Computer opponents for vs-bot mode. Every bot only sees what a human player
// would see and plays through the same engine rules.

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// ---------------------------------------------------------------- Tic Tac Toe
const TTT_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function tttWinner(board) {
  for (const [a, b, c] of TTT_LINES) {
    if (board[a] && board[a] === board[b] && board[b] === board[c]) return board[a];
  }
  return null;
}

function tttFindLineMove(board, symbol) {
  for (const line of TTT_LINES) {
    const marks = line.filter((i) => board[i] === symbol).length;
    const empty = line.filter((i) => board[i] === null);
    if (marks === 2 && empty.length === 1) return empty[0];
  }
  return null;
}

function minimax(board, me, opp, isMyTurn, depth) {
  const winner = tttWinner(board);
  if (winner === me) return 10 - depth;
  if (winner === opp) return depth - 10;
  if (board.every((cell) => cell !== null)) return 0;

  let best = isMyTurn ? -Infinity : Infinity;
  for (let i = 0; i < 9; i++) {
    if (board[i] !== null) continue;
    board[i] = isMyTurn ? me : opp;
    const score = minimax(board, me, opp, !isMyTurn, depth + 1);
    board[i] = null;
    best = isMyTurn ? Math.max(best, score) : Math.min(best, score);
  }
  return best;
}

export function ticTacToeBotMove(board, me, opp, difficulty) {
  const empty = board.map((cell, i) => (cell === null ? i : null)).filter((i) => i !== null);
  if (empty.length === 0) return null;

  if (difficulty === 'easy') {
    // Takes an obvious win sometimes, otherwise random.
    const win = tttFindLineMove(board, me);
    if (win !== null && Math.random() < 0.5) return win;
    return pick(empty);
  }

  if (difficulty === 'medium') {
    const win = tttFindLineMove(board, me);
    if (win !== null) return win;
    const block = tttFindLineMove(board, opp);
    if (block !== null) return block;
    if (board[4] === null) return 4;
    return pick(empty);
  }

  // Hard: perfect play. Prefer faster wins / slower losses, random among ties.
  const work = [...board];
  let bestScore = -Infinity;
  let bestMoves = [];
  for (const i of empty) {
    work[i] = me;
    const score = minimax(work, me, opp, false, 1);
    work[i] = null;
    if (score > bestScore) {
      bestScore = score;
      bestMoves = [i];
    } else if (score === bestScore) {
      bestMoves.push(i);
    }
  }
  return pick(bestMoves);
}

// ---------------------------------------------------------------- Connect Four
const C4_ROWS = 6;
const C4_COLS = 7;
const C4_ORDER = [3, 2, 4, 1, 5, 0, 6];
const C4_DEPTH = { easy: 2, medium: 4, hard: 6 };

function c4DropRow(board, col) {
  for (let r = C4_ROWS - 1; r >= 0; r--) if (board[r][col] === null) return r;
  return -1;
}

function c4IsWin(board, row, col, color) {
  const dirs = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (const [dr, dc] of dirs) {
    let count = 1;
    for (const sign of [1, -1]) {
      let r = row + dr * sign;
      let c = col + dc * sign;
      while (r >= 0 && r < C4_ROWS && c >= 0 && c < C4_COLS && board[r][c] === color) {
        count++;
        r += dr * sign;
        c += dc * sign;
      }
    }
    if (count >= 4) return true;
  }
  return false;
}

function scoreWindow(cells, me, opp) {
  const mine = cells.filter((c) => c === me).length;
  const theirs = cells.filter((c) => c === opp).length;
  const empty = cells.filter((c) => c === null).length;
  if (mine === 4) return 1000;
  if (mine === 3 && empty === 1) return 6;
  if (mine === 2 && empty === 2) return 2;
  if (theirs === 3 && empty === 1) return -8;
  if (theirs === 2 && empty === 2) return -2;
  return 0;
}

function c4Evaluate(board, me, opp) {
  let score = 0;
  for (let r = 0; r < C4_ROWS; r++) if (board[r][3] === me) score += 3;
  for (let r = 0; r < C4_ROWS; r++) {
    for (let c = 0; c < C4_COLS; c++) {
      if (c + 3 < C4_COLS) score += scoreWindow([0, 1, 2, 3].map((i) => board[r][c + i]), me, opp);
      if (r + 3 < C4_ROWS) score += scoreWindow([0, 1, 2, 3].map((i) => board[r + i][c]), me, opp);
      if (r + 3 < C4_ROWS && c + 3 < C4_COLS) score += scoreWindow([0, 1, 2, 3].map((i) => board[r + i][c + i]), me, opp);
      if (r - 3 >= 0 && c + 3 < C4_COLS) score += scoreWindow([0, 1, 2, 3].map((i) => board[r - i][c + i]), me, opp);
    }
  }
  return score;
}

function negamax(board, depth, alpha, beta, me, opp, moveCount) {
  const valid = C4_ORDER.filter((c) => board[0][c] === null);
  if (valid.length === 0) return 0;
  if (depth === 0) return c4Evaluate(board, me, opp);

  let best = -Infinity;
  for (const col of valid) {
    const row = c4DropRow(board, col);
    board[row][col] = me;
    let score;
    if (c4IsWin(board, row, col, me)) score = 100000 - moveCount;
    else score = -negamax(board, depth - 1, -beta, -alpha, opp, me, moveCount + 1);
    board[row][col] = null;
    if (score > best) best = score;
    if (best > alpha) alpha = best;
    if (alpha >= beta) break;
  }
  return best;
}

export function connectFourBotMove(board, me, opp, difficulty) {
  const valid = C4_ORDER.filter((c) => board[0][c] === null);
  if (valid.length === 0) return null;
  if (difficulty === 'easy' && Math.random() < 0.3) return pick(valid);

  const work = board.map((row) => [...row]);
  const depth = C4_DEPTH[difficulty] ?? 4;
  let bestScore = -Infinity;
  let bestCols = [];
  for (const col of valid) {
    const row = c4DropRow(work, col);
    work[row][col] = me;
    const score = c4IsWin(work, row, col, me)
      ? 100000
      : -negamax(work, depth - 1, -Infinity, Infinity, opp, me, 1);
    work[row][col] = null;
    if (score > bestScore) {
      bestScore = score;
      bestCols = [col];
    } else if (score === bestScore) {
      bestCols.push(col);
    }
  }
  return pick(bestCols);
}

// ---------------------------------------------------------------- Rock Paper Scissors
const SPS_CHOICES = ['stone', 'paper', 'scissor'];
const BEATS = { stone: 'paper', paper: 'scissor', scissor: 'stone' };

export function stonePaperScissorBotMove(history, difficulty) {
  if (difficulty === 'easy' || history.length === 0) return pick(SPS_CHOICES);

  const counterMostFrequent = () => {
    const counts = { stone: 0, paper: 0, scissor: 0 };
    history.forEach((choice) => (counts[choice] += 1));
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    return BEATS[top];
  };

  if (difficulty === 'medium') {
    return Math.random() < 0.25 ? pick(SPS_CHOICES) : counterMostFrequent();
  }

  // Hard: what did the human throw after the same two-throw pattern before?
  if (history.length >= 3) {
    const key = history.slice(-2).join('>');
    const next = { stone: 0, paper: 0, scissor: 0 };
    for (let i = 2; i < history.length; i++) {
      if (`${history[i - 2]}>${history[i - 1]}` === key) next[history[i]] += 1;
    }
    const [predicted, count] = Object.entries(next).sort((a, b) => b[1] - a[1])[0];
    if (count > 0) return BEATS[predicted];
  }
  return Math.random() < 0.15 ? pick(SPS_CHOICES) : counterMostFrequent();
}

// ---------------------------------------------------------------- Ludo
// Mirrors the board geometry in backend/src/games/ludo.js.
const LUDO_START_OFFSETS = { '#ef4444': 0, '#22c55e': 13, '#facc15': 26, '#3b82f6': 39 };
const LUDO_SAFE = [0, 8, 13, 21, 26, 34, 39, 47];

const absolute = (color, pos) => (pos < 0 || pos > 50 ? null : (pos + LUDO_START_OFFSETS[color]) % 52);

function isThreatened(state, me, absPos) {
  if (absPos === null || LUDO_SAFE.includes(absPos)) return false;
  return state.players.some(
    (opp) =>
      opp.id !== me.id &&
      opp.tokens.some((t) => {
        const oppAbs = absolute(opp.color, t.position);
        if (oppAbs === null) return false;
        const gap = (absPos - oppAbs + 52) % 52;
        return gap >= 1 && gap <= 6;
      }),
  );
}

export function ludoBotMove(state, botId, difficulty = 'medium') {
  const me = state.players.find((p) => p.id === botId);
  const moves = state.legalMoves ?? [];
  if (!me || moves.length === 0) return null;
  if (difficulty === 'easy' && Math.random() < 0.5) return pick(moves);

  const roll = state.diceRoll;
  let best = null;
  let bestScore = -Infinity;

  for (const tokenId of moves) {
    const token = me.tokens.find((t) => t.id === tokenId);
    let score = 0;

    if (token.position === -1) {
      score += 40;
    } else {
      const target = token.position + roll;
      const fromAbs = absolute(me.color, token.position);
      const toAbs = absolute(me.color, target);

      if (target === 56) score += 100;
      if (target > 50) score += 30; // home column is untouchable

      if (toAbs !== null && !LUDO_SAFE.includes(toAbs)) {
        for (const opp of state.players) {
          if (opp.id === me.id) continue;
          const victims = opp.tokens.filter((t) => absolute(opp.color, t.position) === toAbs);
          if (victims.length === 1) score += 60 + victims[0].position * 0.6;
        }
      }
      if (toAbs !== null && LUDO_SAFE.includes(toAbs)) score += 20;
      if (isThreatened(state, me, fromAbs)) score += 25;
      if (isThreatened(state, me, toAbs)) score -= 35;
      score += target * 0.3;
    }

    if (score > bestScore) {
      bestScore = score;
      best = tokenId;
    }
  }
  return best;
}
