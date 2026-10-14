import { CLAIMS_BY_ID, DEFAULT_CLAIMS, checkClaim, sanitizeClaimIds } from './tambolaClaims.js';

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

export function createTambolaState(players, hostId, claimIds = DEFAULT_CLAIMS) {
  const availableNumbers = shuffle(Array.from({ length: 90 }, (_, i) => i + 1));
  const enabledClaims = sanitizeClaimIds(claimIds);

  return {
    status: 'playing',
    drawnNumbers: [],
    availableNumbers,
    enabledClaims,
    // claimId -> winning playerId (null while open)
    activeClaims: Object.fromEntries(enabledClaims.map((id) => [id, null])),
    // Chronological list of wins: { claimId, playerId, playerName, number }
    claimLog: [],
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

function isGameComplete(state) {
  const houses = state.enabledClaims.filter((id) => CLAIMS_BY_ID[id]?.tier);
  const lastHouse = houses[houses.length - 1];
  if (lastHouse && state.activeClaims[lastHouse]) return true;
  return state.enabledClaims.every((id) => state.activeClaims[id]);
}

export function claimPattern(state, playerId, patternName) {
  if (state.status !== 'playing') {
    return { ok: false, error: 'Game is finished' };
  }
  if (!state.enabledClaims.includes(patternName)) {
    return { ok: false, error: 'This prize is not part of this game' };
  }
  if (state.activeClaims[patternName]) {
    return { ok: false, error: 'Prize already claimed' };
  }

  const player = state.players.find((p) => p.id === playerId);
  if (!player) return { ok: false, error: 'Player not found in game' };

  const claim = CLAIMS_BY_ID[patternName];
  if (claim.tier) {
    const previousTier = state.enabledClaims.find((id) => CLAIMS_BY_ID[id]?.tier === claim.tier - 1);
    if (previousTier && !state.activeClaims[previousTier]) {
      return { ok: false, error: `${CLAIMS_BY_ID[previousTier].label} must be won first` };
    }
    const alreadyHasHouse = player.claimsWon.some((id) => CLAIMS_BY_ID[id]?.tier);
    if (alreadyHasHouse) return { ok: false, error: 'You already won a Full House' };
  }

  if (!checkClaim(patternName, player.ticket, state.drawnNumbers)) {
    return { ok: false, error: 'Not yet! Those numbers have not all been called' };
  }

  state.activeClaims[patternName] = playerId;
  player.claimsWon.push(patternName);
  state.claimLog.push({
    claimId: patternName,
    playerId,
    playerName: player.name,
    number: state.drawnNumbers[state.drawnNumbers.length - 1] ?? null,
  });

  if (isGameComplete(state)) state.status = 'finished';
  return { ok: true };
}

export function serializeTambolaState(state) {
  return {
    status: state.status,
    drawnNumbers: state.drawnNumbers,
    enabledClaims: state.enabledClaims,
    activeClaims: state.activeClaims,
    claimLog: state.claimLog,
    players: state.players,
    hostId: state.hostId,
  };
}
