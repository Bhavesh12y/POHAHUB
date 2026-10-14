// Tambola claim catalogue. Shared by the server (claim validation) and the
// browser (claim picker, labels, rules). Each player has one 3x9 ticket with
// 5 numbers per row; columns hold 1-9, 10-19, ... 80-90.

function ticketInfo(ticket) {
  const rows = ticket.map((row) => row.filter((n) => n !== null));
  const all = rows.flat();
  const sorted = [...all].sort((a, b) => a - b);
  const columnGroup = (from, to) =>
    ticket.flatMap((row) => row.slice(from, to + 1)).filter((n) => n !== null);
  return { rows, all, sorted, columnGroup };
}

const allDrawn = (numbers, drawn) => numbers.length > 0 && numbers.every((n) => drawn.has(n));
const countDrawn = (numbers, drawn) => numbers.filter((n) => drawn.has(n)).length;
const fullRows = (rows, drawn) => rows.filter((row) => allDrawn(row, drawn)).length;

export const CLAIM_CATEGORIES = [
  'Early Bird',
  'Lines',
  'Shapes & Corners',
  'Extreme Numbers',
  'Kitty Specials',
  'Meal Columns',
  'Full House',
];

export const TAMBOLA_CLAIMS = [
  // --- Early Bird
  { id: 'early5', label: 'Early 5 (Jaldi 5)', category: 'Early Bird', desc: 'Any 5 numbers on your ticket.',
    check: ({ all }, d) => countDrawn(all, d) >= 5 },
  { id: 'early7', label: 'Early 7', category: 'Early Bird', desc: 'Any 7 numbers on your ticket.',
    check: ({ all }, d) => countDrawn(all, d) >= 7 },
  { id: 'early10', label: 'Early 10', category: 'Early Bird', desc: 'Any 10 numbers on your ticket.',
    check: ({ all }, d) => countDrawn(all, d) >= 10 },

  // --- Lines
  { id: 'topLine', label: 'Top Line', category: 'Lines', desc: 'All 5 numbers of the first row.',
    check: ({ rows }, d) => allDrawn(rows[0], d) },
  { id: 'middleLine', label: 'Middle Line', category: 'Lines', desc: 'All 5 numbers of the second row.',
    check: ({ rows }, d) => allDrawn(rows[1], d) },
  { id: 'bottomLine', label: 'Bottom Line', category: 'Lines', desc: 'All 5 numbers of the third row.',
    check: ({ rows }, d) => allDrawn(rows[2], d) },
  { id: 'twoLines', label: 'Any Two Lines', category: 'Lines', desc: 'Any two complete rows.',
    check: ({ rows }, d) => fullRows(rows, d) >= 2 },

  // --- Shapes & Corners
  { id: 'fourCorners', label: 'Four Corners', category: 'Shapes & Corners',
    desc: 'First and last numbers of the top and bottom rows.',
    check: ({ rows }, d) => allDrawn([rows[0][0], rows[0][4], rows[2][0], rows[2][4]], d) },
  { id: 'star', label: 'Star', category: 'Shapes & Corners',
    desc: 'The four corners plus the centre number of the middle row.',
    check: ({ rows }, d) => allDrawn([rows[0][0], rows[0][4], rows[2][0], rows[2][4], rows[1][2]], d) },
  { id: 'kingCorner', label: 'King Corner', category: 'Shapes & Corners',
    desc: 'First number of the top row and last number of the bottom row.',
    check: ({ rows }, d) => allDrawn([rows[0][0], rows[2][4]], d) },
  { id: 'queenCorner', label: 'Queen Corner', category: 'Shapes & Corners',
    desc: 'Last number of the top row and first number of the bottom row.',
    check: ({ rows }, d) => allDrawn([rows[0][4], rows[2][0]], d) },
  { id: 'innerBox', label: 'Inner Box', category: 'Shapes & Corners',
    desc: '2nd and 4th numbers of the top and bottom rows, framing the centre of the ticket.',
    check: ({ rows }, d) => allDrawn([rows[0][1], rows[0][3], rows[2][1], rows[2][3]], d) },
  { id: 'pyramid', label: 'Pyramid', category: 'Shapes & Corners',
    desc: 'Centre of the top row, 2nd and 4th of the middle row, and 1st, 3rd and 5th of the bottom row.',
    check: ({ rows }, d) => allDrawn([rows[0][2], rows[1][1], rows[1][3], rows[2][0], rows[2][2], rows[2][4]], d) },
  { id: 'ladoo', label: 'Ladoo', category: 'Shapes & Corners', desc: 'The centre number of the middle row.',
    check: ({ rows }, d) => allDrawn([rows[1][2]], d) },

  // --- Extreme Numbers
  { id: 'temperature', label: 'Smallest & Largest', category: 'Extreme Numbers',
    desc: 'The lowest and the highest number on your ticket (Temperature).',
    check: ({ sorted }, d) => allDrawn([sorted[0], sorted[sorted.length - 1]], d) },
  { id: 'smallest3', label: 'Smallest 3', category: 'Extreme Numbers', desc: 'The three lowest numbers on your ticket.',
    check: ({ sorted }, d) => allDrawn(sorted.slice(0, 3), d) },
  { id: 'largest3', label: 'Largest 3', category: 'Extreme Numbers', desc: 'The three highest numbers on your ticket.',
    check: ({ sorted }, d) => allDrawn(sorted.slice(-3), d) },
  { id: 'bpHigh', label: 'BP High', category: 'Extreme Numbers', desc: 'The highest number of each of the three rows.',
    check: ({ rows }, d) => allDrawn(rows.map((r) => Math.max(...r)), d) },
  { id: 'bpLow', label: 'BP Low', category: 'Extreme Numbers', desc: 'The lowest number of each of the three rows.',
    check: ({ rows }, d) => allDrawn(rows.map((r) => Math.min(...r)), d) },

  // --- Kitty Specials
  { id: 'devrani', label: 'Devrani (1-45)', category: 'Kitty Specials', desc: 'Every number from 1 to 45 on your ticket.',
    check: ({ all }, d) => allDrawn(all.filter((n) => n <= 45), d) },
  { id: 'jethani', label: 'Jethani (46-90)', category: 'Kitty Specials', desc: 'Every number from 46 to 90 on your ticket.',
    check: ({ all }, d) => allDrawn(all.filter((n) => n >= 46), d) },
  { id: 'oddNumbers', label: 'All Odd', category: 'Kitty Specials', desc: 'Every odd number on your ticket.',
    check: ({ all }, d) => allDrawn(all.filter((n) => n % 2 === 1), d) },
  { id: 'evenNumbers', label: 'All Even', category: 'Kitty Specials', desc: 'Every even number on your ticket.',
    check: ({ all }, d) => allDrawn(all.filter((n) => n % 2 === 0), d) },

  // --- Meal Columns
  { id: 'breakfast', label: 'Breakfast', category: 'Meal Columns', desc: 'Every number in columns 1-3 (1 to 29).',
    check: ({ columnGroup }, d) => allDrawn(columnGroup(0, 2), d) },
  { id: 'lunch', label: 'Lunch', category: 'Meal Columns', desc: 'Every number in columns 4-6 (30 to 59).',
    check: ({ columnGroup }, d) => allDrawn(columnGroup(3, 5), d) },
  { id: 'dinner', label: 'Dinner', category: 'Meal Columns', desc: 'Every number in columns 7-9 (60 to 90).',
    check: ({ columnGroup }, d) => allDrawn(columnGroup(6, 8), d) },

  // --- Full House (tiers must be won in order, by different players)
  { id: 'fullHouse', label: 'Full House', category: 'Full House', desc: 'All 15 numbers on your ticket.', tier: 1,
    check: ({ all }, d) => allDrawn(all, d) },
  { id: 'secondHouse', label: '2nd Full House', category: 'Full House',
    desc: 'All 15 numbers, after the first Full House has been won.', tier: 2,
    check: ({ all }, d) => allDrawn(all, d) },
  { id: 'thirdHouse', label: '3rd Full House', category: 'Full House',
    desc: 'All 15 numbers, after the 2nd Full House has been won.', tier: 3,
    check: ({ all }, d) => allDrawn(all, d) },
];

export const CLAIMS_BY_ID = Object.fromEntries(TAMBOLA_CLAIMS.map((c) => [c.id, c]));

export const CLAIM_PRESETS = {
  classic: { label: 'Classic', claims: ['early5', 'topLine', 'middleLine', 'bottomLine', 'fourCorners', 'fullHouse'] },
  kitty: {
    label: 'Kitty Party',
    claims: ['early5', 'early7', 'topLine', 'middleLine', 'bottomLine', 'star', 'temperature', 'devrani', 'jethani',
      'breakfast', 'lunch', 'dinner', 'fullHouse', 'secondHouse'],
  },
  quick: { label: 'Quick Game', claims: ['early5', 'ladoo', 'kingCorner', 'queenCorner', 'topLine', 'fullHouse'] },
  everything: { label: 'Everything', claims: TAMBOLA_CLAIMS.map((c) => c.id) },
};

export const DEFAULT_CLAIMS = CLAIM_PRESETS.classic.claims;

// Keeps only known ids, preserves catalogue order, and always includes Full House.
export function sanitizeClaimIds(ids) {
  const wanted = new Set(Array.isArray(ids) ? ids : DEFAULT_CLAIMS);
  wanted.add('fullHouse');
  if (wanted.has('thirdHouse')) wanted.add('secondHouse');
  return TAMBOLA_CLAIMS.filter((c) => wanted.has(c.id)).map((c) => c.id);
}

export function checkClaim(claimId, ticket, drawnNumbers) {
  const claim = CLAIMS_BY_ID[claimId];
  if (!claim) return false;
  return claim.check(ticketInfo(ticket), new Set(drawnNumbers));
}
