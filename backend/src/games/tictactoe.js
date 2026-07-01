const BOARD_SIZE = 9;
const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

export function createTicTacToeState(players, previousStartingIndex = null) {
  const startIndex = previousStartingIndex !== null 
    ? (previousStartingIndex + 1) % players.length 
    : 0; 
  
  return {
    board: Array(BOARD_SIZE).fill(null),
    players: players.map((p) => ({ id: p.id, name: p.name, symbol: p.symbol })),
    startingIndex: startIndex, 
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

export function playMove(state, index, playerId) {
  if (state.status !== 'playing') {
    return { ok: false, error: 'Game is already over' };
  }

  const current = getCurrentPlayer(state);
  if (current.id !== playerId) {
    return { ok: false, error: 'Not your turn' };
  }

  if (index < 0 || index >= BOARD_SIZE) {
    return { ok: false, error: 'Invalid cell index' };
  }

  if (state.board[index] !== null) {
    return { ok: false, error: 'Cell is already occupied' };
  }

  state.board[index] = current.symbol;
  state.lastMove = { index, symbol: current.symbol, playerId };

  const win = checkWin(state.board);
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
  return board.every((cell) => cell !== null);
}

function checkWin(board) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] !== null && board[a] === board[b] && board[b] === board[c]) {
      return { cells: line };
    }
  }
  return null;
}

export function serializeTicTacToeState(state) {
  return {
    board: state.board,
    players: state.players,
    startingIndex: state.startingIndex,
    currentTurnIndex: state.currentTurnIndex,
    currentPlayerId: getCurrentPlayer(state)?.id ?? null,
    winner: state.winner,
    winningCells: state.winningCells,
    status: state.status,
    lastMove: state.lastMove,
  };
}