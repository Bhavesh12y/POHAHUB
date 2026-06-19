function shuffle(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function generateTicketStructure() {
  while (true) {
    const cols = Array(9).fill(1);
    let remaining = 6;
    while (remaining > 0) {
      const c = Math.floor(Math.random() * 9);
      if (cols[c] < 3) {
        cols[c]++;
        remaining--;
      }
    }

    const grid = [Array(9).fill(false), Array(9).fill(false), Array(9).fill(false)];
    for (let c = 0; c < 9; c++) {
      const rows = shuffle([0, 1, 2]);
      for (let i = 0; i < cols[c]; i++) {
        grid[rows[i]][c] = true;
      }
    }

    if (grid.every((row) => row.filter(Boolean).length === 5)) {
      return grid;
    }
  }
}

function generateTicket() {
  const structure = generateTicketStructure();
  const ticket = [Array(9).fill(null), Array(9).fill(null), Array(9).fill(null)];

  const ranges = [
    { min: 1, max: 9 }, { min: 10, max: 19 }, { min: 20, max: 29 },
    { min: 30, max: 39 }, { min: 40, max: 49 }, { min: 50, max: 59 },
    { min: 60, max: 69 }, { min: 70, max: 79 }, { min: 80, max: 90 }
  ];

  for (let c = 0; c < 9; c++) {
    const needed = structure.reduce((acc, row) => acc + (row[c] ? 1 : 0), 0);
    
    let pool = [];
    for (let i = ranges[c].min; i <= ranges[c].max; i++) pool.push(i);
    
    const selected = shuffle(pool).slice(0, needed).sort((a, b) => a - b);

    let selIdx = 0;
    for (let r = 0; r < 3; r++) {
      if (structure[r][c]) {
        ticket[r][c] = selected[selIdx++];
      }
    }
  }

  return ticket;
}

export function createTambolaState(players, hostId) {
  const availableNumbers = shuffle(Array.from({ length: 90 }, (_, i) => i + 1));

  return {
    status: 'playing',
    drawnNumbers: [],
    availableNumbers,
    activeClaims: {
      early5: null,
      topLine: null,
      middleLine: null,
      bottomLine: null,
      fourCorners: null,
      ladoo: null,          // NEW
      kingCorner: null,     // NEW
      queenCorner: null,    // NEW
      smallest3: null,      // NEW
      largest3: null,       // NEW
      fullHouse: null,
    },
    players: players.map((p) => ({
      id: p.id,
      name: p.name,
      ticket: generateTicket(),
      claimsWon: [],
    })),
    hostId,
  };
}

export function drawNumber(state, playerId) {
  if (state.status !== 'playing') {
    return { ok: false, error: 'Game is already finished' };
  }
  if (playerId !== state.hostId) {
    return { ok: false, error: 'Only the host can draw numbers' };
  }
  if (state.availableNumbers.length === 0) {
    return { ok: false, error: 'All numbers have been drawn' };
  }

  const drawnNumber = state.availableNumbers.pop();
  state.drawnNumbers.push(drawnNumber);

  return { ok: true, drawnNumber };
}

export function claimPattern(state, playerId, patternName) {
  if (state.status !== 'playing') {
    return { ok: false, error: 'Game is finished' };
  }
  if (state.activeClaims[patternName] !== undefined && state.activeClaims[patternName] !== null) {
    return { ok: false, error: 'Pattern already claimed' };
  }

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, error: 'Player not found in game' };

  const drawnSet = new Set(state.drawnNumbers);
  const getRowNumbers = (rowIndex) => player.ticket[rowIndex].filter((n) => n !== null);
  
  const row0 = getRowNumbers(0);
  const row1 = getRowNumbers(1);
  const row2 = getRowNumbers(2);
  const allNumbers = [...row0, ...row1, ...row2];
  const allSorted = [...allNumbers].sort((a, b) => a - b);

  let isValid = false;

  switch (patternName) {
    case 'early5':
      isValid = allNumbers.filter((n) => drawnSet.has(n)).length >= 5;
      break;
    case 'topLine':
      isValid = row0.length > 0 && row0.every((n) => drawnSet.has(n));
      break;
    case 'middleLine':
      isValid = row1.length > 0 && row1.every((n) => drawnSet.has(n));
      break;
    case 'bottomLine':
      isValid = row2.length > 0 && row2.every((n) => drawnSet.has(n));
      break;
    case 'fourCorners':
      const corners = [row0[0], row0[row0.length - 1], row2[0], row2[row2.length - 1]];
      isValid = corners.every((n) => drawnSet.has(n));
      break;
    case 'ladoo':
      // The exact middle number of the middle row (3rd out of 5 numbers)
      isValid = row1.length >= 3 && drawnSet.has(row1[2]);
      break;
    case 'kingCorner':
      // Top-Left and Bottom-Right bounds
      isValid = row0.length > 0 && row2.length > 0 && drawnSet.has(row0[0]) && drawnSet.has(row2[row2.length - 1]);
      break;
    case 'queenCorner':
      // Top-Right and Bottom-Left bounds
      isValid = row0.length > 0 && row2.length > 0 && drawnSet.has(row0[row0.length - 1]) && drawnSet.has(row2[0]);
      break;
    case 'smallest3':
      // The lowest 3 numbers on the ticket
      isValid = allSorted.slice(0, 3).every((n) => drawnSet.has(n));
      break;
    case 'largest3':
      // The highest 3 numbers on the ticket
      isValid = allSorted.slice(-3).every((n) => drawnSet.has(n));
      break;
    case 'fullHouse':
      isValid = allNumbers.every((n) => drawnSet.has(n));
      break;
    default:
      return { ok: false, error: 'Invalid pattern name' };
  }

  if (isValid) {
    state.activeClaims[patternName] = playerId;
    player.claimsWon.push(patternName);
    
    if (patternName === 'fullHouse') {
      state.status = 'finished';
    }
    return { ok: true };
  } else {
    return { ok: false, error: 'Invalid claim: Conditions not met' };
  }
}

export function serializeTambolaState(state) {
  return {
    status: state.status,
    drawnNumbers: state.drawnNumbers,
    activeClaims: state.activeClaims,
    players: state.players,
    hostId: state.hostId,
  };
}