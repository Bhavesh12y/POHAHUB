// Flappy Bird rules from the original 2D version (400 x 600 field, y down).

export const FIELD_W = 400;
export const FIELD_H = 600;
export const GRAVITY = 0.2;
export const JUMP_STRENGTH = -4.5;
export const PIPE_WIDTH = 60;
export const BIRD_SIZE = 34;
export const BIRD_X = 60;

const difficulty = (score) => ({
  gap: Math.max(100, 160 - score * 2),
  speed: 2.5 + score * 0.05,
  spawnRate: Math.max(70, 110 - score),
});

let nextId = 1;

export function createFlappyState() {
  return { birdY: FIELD_H / 2, birdV: 0, pipes: [], score: 0, spawnTimer: 0, isGameOver: false, hasStarted: false, time: 0 };
}

export function flap(state) {
  if (!state.isGameOver && state.hasStarted) state.birdV = JUMP_STRENGTH;
}

/** @returns { pipesChanged, scored, crashed } */
export function stepFlappy(state, dt) {
  const events = { pipesChanged: false, scored: false, crashed: false };
  state.time += dt;
  if (state.isGameOver || !state.hasStarted) return events;
  const t = Math.min(dt, 0.1) * 60;
  const { speed, spawnRate, gap } = difficulty(state.score);

  state.birdV += GRAVITY * t;
  state.birdY += state.birdV * t;
  if (state.birdY + BIRD_SIZE >= FIELD_H || state.birdY <= 0) {
    state.isGameOver = true;
    events.crashed = true;
  }

  state.spawnTimer += t;
  if (state.spawnTimer >= spawnRate) {
    state.spawnTimer = 0;
    const minH = 50;
    const maxH = FIELD_H - gap - minH;
    const topHeight = Math.floor(Math.random() * (maxH - minH + 1)) + minH;
    state.pipes.push({ id: nextId++, x: FIELD_W, topHeight, gap, passed: false });
    events.pipesChanged = true;
  }

  for (const pipe of state.pipes) {
    pipe.x -= speed * t;
    const left = BIRD_X;
    const right = BIRD_X + BIRD_SIZE;
    const top = state.birdY;
    const bottom = state.birdY + BIRD_SIZE;
    const inColumn = right > pipe.x && left < pipe.x + PIPE_WIDTH;
    if (inColumn && (top < pipe.topHeight || bottom > pipe.topHeight + pipe.gap)) {
      state.isGameOver = true;
      events.crashed = true;
    }
    if (!pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X) {
      pipe.passed = true;
      state.score += 1;
      events.scored = true;
    }
  }
  const before = state.pipes.length;
  state.pipes = state.pipes.filter((p) => p.x + PIPE_WIDTH > -40);
  if (state.pipes.length !== before) events.pipesChanged = true;
  return events;
}
