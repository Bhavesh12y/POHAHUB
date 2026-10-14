// Traffic Run rules from the original version. Positions are in percent of the
// track length (0 = far end, 100 = behind the player), lanes are 0, 1, 2.

export const PLAYER_TOP = 75;
export const PLAYER_BOTTOM = 86;
const CAR_COLORS = ['#ef476f', '#118ab2', '#ffd166', '#f78c6b', '#9b5de5', '#ff99c8'];
const randomColor = () => CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)];
const shuffle = (arr) => [...arr].sort(() => Math.random() - 0.5);
let nextId = 1;

export function createTrafficState() {
  return { lane: 1, obstacles: [], score: 0, speed: 2.5, spawnTimer: 0, elapsed: 0, level: 1, isGameOver: false, isPlaying: false };
}

export function startTraffic(state) {
  Object.assign(state, createTrafficState(), { isPlaying: true });
}

export function setLane(state, lane) {
  if (state.isPlaying && !state.isGameOver) state.lane = Math.max(0, Math.min(2, lane));
}

const make = (lane, type, extra = {}) => {
  const sizes = { car: { height: 18, y: -20 }, truck: { height: 26, y: -28 }, cone: { height: 12, y: -20 }, barrier: { height: 18, y: -20 } };
  return { id: nextId++, lane, type, ...sizes[type], color: randomColor(), ...extra };
};

/** @returns { changed, crashed, scored, levelUp } */
export function stepTraffic(state, dt) {
  const events = { changed: false, crashed: false, scored: false, levelUp: false };
  if (!state.isPlaying || state.isGameOver) return events;
  const f = Math.min(3, (dt * 1000) / (1000 / 60));
  state.elapsed += dt;

  const level = Math.min(15, Math.floor(state.elapsed / 8) + 1);
  if (level !== state.level) {
    state.level = level;
    events.levelUp = true;
  }
  const maxSpeed = 4 + level * 0.5;
  const spawnThreshold = Math.max(12, 45 - level * 2);

  for (const ob of state.obstacles) ob.y += state.speed * f;

  for (const ob of state.obstacles) {
    if (ob.lane === state.lane && ob.y + ob.height - 2 > PLAYER_TOP && ob.y + 2 < PLAYER_BOTTOM) {
      state.isGameOver = true;
      state.isPlaying = false;
      events.crashed = true;
      return events;
    }
  }

  const passed = state.obstacles.filter((ob) => ob.y > 100);
  if (passed.length) {
    state.score += passed.length * 10;
    state.speed = Math.min(state.speed + passed.length * 0.03, maxSpeed);
    state.obstacles = state.obstacles.filter((ob) => ob.y <= 100);
    events.scored = true;
    events.changed = true;
  }

  state.spawnTimer += f;
  if (state.spawnTimer > spawnThreshold) {
    state.spawnTimer = 0;
    const barrierProb = level >= 3 ? Math.min(0.4, 0.1 + (level - 3) * 0.05) : 0;
    const truckProb = level >= 2 ? 0.25 : 0;
    if (Math.random() < barrierProb) {
      const barrierLane = Math.floor(Math.random() * 3);
      state.obstacles.push(make(barrierLane, 'barrier'));
      if (Math.random() < 0.6) {
        const other = shuffle([0, 1, 2].filter((l) => l !== barrierLane))[0];
        state.obstacles.push(level >= 2 && Math.random() < 0.3 ? make(other, 'cone') : make(other, 'car'));
      }
    } else {
      const count = level < 2 ? 1 : Math.random() < 0.4 ? 2 : 1;
      const useTruck = Math.random() < truckProb;
      shuffle([0, 1, 2])
        .slice(0, count)
        .forEach((lane, idx) => {
          if (useTruck && idx === 0) state.obstacles.push(make(lane, 'truck'));
          else state.obstacles.push(level >= 2 && Math.random() < 0.2 ? make(lane, 'cone') : make(lane, 'car'));
        });
    }
    events.changed = true;
  }
  return events;
}
