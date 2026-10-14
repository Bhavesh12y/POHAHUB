// Dino Run rules (same numbers as the original 2D version). Units are the old
// game pixels: x grows to the right, y is height above the ground.

export const GRAVITY = 0.7;
export const JUMP_POWER = 13;
export const MAX_SPEED = 14;
export const SPEED_GAIN = 0.003;
export const DINO_X = 40;
export const DINO_SIZE = 40;
export const SPAWN_X = 620;

const OBSTACLES = [
  { width: 22, height: 40, type: 'small' },
  { width: 28, height: 55, type: 'large' },
  { width: 45, height: 45, type: 'double' },
];

let nextId = 1;

export function createDinoState() {
  return { dinoY: 0, velocityY: 0, obstacles: [], score: 0, frames: 0, speed: 4, nextSpawnFrame: 50, isGameOver: false, isPlaying: false };
}

export function startDino(state) {
  Object.assign(state, createDinoState(), { isPlaying: true });
}

export function jumpDino(state) {
  if (state.isPlaying && state.dinoY === 0) state.velocityY = JUMP_POWER;
}

/** @returns { spawned: boolean, crashed: boolean } */
export function stepDino(state, dt) {
  const events = { spawned: false, crashed: false };
  if (!state.isPlaying || state.isGameOver) return events;
  const t = Math.min(dt, 0.1) * 60;

  state.frames += t;
  state.score += state.speed * 0.02 * t;
  if (state.speed < MAX_SPEED) state.speed += SPEED_GAIN * t;

  state.dinoY += state.velocityY * t;
  state.velocityY -= GRAVITY * t;
  if (state.dinoY <= 0) {
    state.dinoY = 0;
    state.velocityY = 0;
  }

  if (state.frames >= state.nextSpawnFrame) {
    const config = OBSTACLES[Math.floor(Math.random() * OBSTACLES.length)];
    state.obstacles.push({ id: nextId++, x: SPAWN_X, ...config });
    const baseGap = Math.max(35, 100 - state.speed * 5);
    state.nextSpawnFrame = state.frames + baseGap + Math.random() * 40;
    events.spawned = true;
  }

  for (const obs of state.obstacles) obs.x -= state.speed * t;
  const before = state.obstacles.length;
  state.obstacles = state.obstacles.filter((obs) => obs.x > -80);
  if (state.obstacles.length !== before) events.spawned = true;

  for (const obs of state.obstacles) {
    if (DINO_X < obs.x + obs.width && DINO_X + DINO_SIZE > obs.x && state.dinoY < obs.height) {
      state.isGameOver = true;
      state.isPlaying = false;
      events.crashed = true;
      break;
    }
  }
  return events;
}
