// 2048 rules with tile identities, so the 3D board can animate slides and merges.
// A tile is { id, value, r, c }. Same rules as the original grid version.

export const SIZE = 4;
let nextId = 1;

function emptyCells(tiles) {
  const taken = new Set(tiles.map((t) => `${t.r}-${t.c}`));
  const cells = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) if (!taken.has(`${r}-${c}`)) cells.push({ r, c });
  return cells;
}

function addRandomTile(tiles) {
  const cells = emptyCells(tiles);
  if (cells.length === 0) return null;
  const { r, c } = cells[Math.floor(Math.random() * cells.length)];
  const tile = { id: nextId++, value: Math.random() < 0.9 ? 2 : 4, r, c, born: true };
  tiles.push(tile);
  return tile;
}

export function newGame() {
  const tiles = [];
  addRandomTile(tiles);
  addRandomTile(tiles);
  return { tiles, score: 0, over: false };
}

// Cell coordinates of line `i`, ordered from the edge tiles slide towards.
function lineCells(dir, i) {
  const idx = [0, 1, 2, 3];
  if (dir === 'left') return idx.map((c) => ({ r: i, c }));
  if (dir === 'right') return idx.map((c) => ({ r: i, c: SIZE - 1 - c }));
  if (dir === 'up') return idx.map((r) => ({ r, c: i }));
  return idx.map((r) => ({ r: SIZE - 1 - r, c: i }));
}

function hasMoves(tiles) {
  if (tiles.length < SIZE * SIZE) return true;
  const grid = {};
  tiles.forEach((t) => (grid[`${t.r}-${t.c}`] = t.value));
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const v = grid[`${r}-${c}`];
      if (grid[`${r}-${c + 1}`] === v || grid[`${r + 1}-${c}`] === v) return true;
    }
  }
  return false;
}

/**
 * @returns null if nothing moved, otherwise
 *   { tiles, score, over, gained, ghosts } where ghosts are tiles that slid
 *   into a merge and should vanish once they arrive.
 */
export function move(state, dir) {
  const byCell = {};
  state.tiles.forEach((t) => (byCell[`${t.r}-${t.c}`] = t));

  const tiles = [];
  const ghosts = [];
  let gained = 0;
  let moved = false;

  for (let i = 0; i < SIZE; i++) {
    const cells = lineCells(dir, i);
    const line = cells.map(({ r, c }) => byCell[`${r}-${c}`]).filter(Boolean);
    let slot = 0;
    let last = null; // last placed tile in this line: { tile, merged }

    for (const tile of line) {
      if (last && !last.merged && last.tile.value === tile.value) {
        const target = cells[slot - 1];
        const merged = { id: nextId++, value: tile.value * 2, r: target.r, c: target.c, merged: true };
        // Both originals slide to the target and disappear under the new tile.
        ghosts.push({ ...last.tile, r: target.r, c: target.c });
        ghosts.push({ ...tile, r: target.r, c: target.c });
        tiles.splice(tiles.indexOf(last.tile), 1, merged);
        last = { tile: merged, merged: true };
        gained += merged.value;
        moved = true;
      } else {
        const target = cells[slot];
        if (target.r !== tile.r || target.c !== tile.c) moved = true;
        const placed = { id: tile.id, value: tile.value, r: target.r, c: target.c };
        tiles.push(placed);
        last = { tile: placed, merged: false };
        slot += 1;
      }
    }
  }

  if (!moved) return null;
  addRandomTile(tiles);
  return { tiles, score: state.score + gained, over: !hasMoves(tiles), gained, ghosts };
}

export const TILE_COLORS = {
  2: '#ff99c8',
  4: '#a9def9',
  8: '#fcf6bd',
  16: '#d0f4de',
  32: '#e4c1f9',
  64: '#ffb5a7',
  128: '#fec89a',
  256: '#ffd166',
  512: '#06d6a0',
  1024: '#118ab2',
  2048: '#ef476f',
};

export function tileColor(value) {
  return TILE_COLORS[value] || '#ffffff';
}

export function tileTextColor(value) {
  return value >= 1024 ? '#ffffff' : '#111111';
}
