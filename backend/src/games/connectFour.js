const ROWS = 6;
const COLS = 7;
const WIN_LENGTH = 4;

export function createConnectFourState(players) {
   const startIndex = Math.floor(Math.random() * players.length); 
  return {
    board: Array.from({ length: ROWS }, () => Array(COLS).fill(null)),
    players: players.map((p) => ({ id: p.id, name: p.name, color: p.color })),
    currentTurnIndex: startIndex, 
    winner: null,
    winningCells: [],
    status: 'playing',
    lastMove: null,
  };
}



export function getCurrentPlayer(state) {
  return state.players[state.currentTurnIndex];
}

export function dropDisc(state, column, playerId) {
  if (state.status !== 'playing') {
    return { ok: false, error: 'Game is already over' };
  }

  const current = getCurrentPlayer(state);
  if (current.id !== playerId) {
    return { ok: false, error: 'Not your turn' };
  }

  if (column < 0 || column >= COLS) {
    return { ok: false, error: 'Invalid column' };
  }

  let row = -1;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (state.board[r][column] === null) {
      row = r;
      break;
    }
  }

  if (row === -1) {
    return { ok: false, error: 'Column is full' };
  }

  state.board[row][column] = current.color;
  state.lastMove = { row, column, color: current.color, playerId };

  const win = checkWin(state.board, row, column, current.color);
  if (win) {
    state.winner = current;
    state.winningCells = win.cells;
    state.status = 'won';
    return { ok: true };
  }

  if (isBoardFull(state.board)) {
    state.status = 'draw';
    return { ok: true };
  }

  state.currentTurnIndex = (state.currentTurnIndex + 1) % state.players.length;
  return { ok: true };
}

function isBoardFull(board) {
  return board[0].every((cell) => cell !== null);
}

function checkWin(board, row, col, color) {
  const directions = [
    [0, 1],
    [1, 0],
    [1, 1],
    [1, -1],
  ];

  for (const [dr, dc] of directions) {
    const cells = [[row, col]];

    for (let i = 1; i < WIN_LENGTH; i++) {
      const r = row + dr * i;
      const c = col + dc * i;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === color) {
        cells.push([r, c]);
      } else {
        break;
      }
    }

    for (let i = 1; i < WIN_LENGTH; i++) {
      const r = row - dr * i;
      const c = col - dc * i;
      if (r >= 0 && r < ROWS && c >= 0 && c < COLS && board[r][c] === color) {
        cells.unshift([r, c]);
      } else {
        break;
      }
    }

    if (cells.length >= WIN_LENGTH) {
      return { cells: cells.slice(0, WIN_LENGTH) };
    }
  }

  return null;
}

export function serializeConnectFourState(state) {
  return {
    board: state.board,
    players: state.players,
    currentTurnIndex: state.currentTurnIndex,
    currentPlayerId: getCurrentPlayer(state)?.id ?? null,
    winner: state.winner,
    winningCells: state.winningCells,
    status: state.status,
    lastMove: state.lastMove,
  };
}

export { ROWS, COLS };
