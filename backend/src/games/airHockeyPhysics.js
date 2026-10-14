// Shared air hockey physics. Runs unchanged on the server (online matches) and
// in the browser (client-side puck simulation, local split screen, vs bot).
// Units: pixels and seconds. Table space has p1 at the bottom, p2 at the top.

export const TABLE = {
  WIDTH: 480,
  HEIGHT: 720,
  PUCK_RADIUS: 22,
  STRIKER_RADIUS: 38,
  GOAL_WIDTH: 160,
  MAX_SCORE: 5,
};

export const PHYSICS = {
  FRICTION_PER_SECOND: 0.74, // fraction of speed kept after 1s of free gliding
  MAX_PUCK_SPEED: 1500,
  MAX_STRIKER_SPEED: 2600, // caps how much energy a single flick can add
  WALL_RESTITUTION: 0.9,
  STRIKER_RESTITUTION: 0.92,
  STEP: 1 / 120, // fixed simulation step
  SUBSTEPS: 4, // swept sub-steps per fixed step
};

const { WIDTH, HEIGHT, PUCK_RADIUS, STRIKER_RADIUS, GOAL_WIDTH } = TABLE;
const GOAL_LEFT = (WIDTH - GOAL_WIDTH) / 2;
const GOAL_RIGHT = (WIDTH + GOAL_WIDTH) / 2;
const HOME_OFFSET = 80;

export function strikerHome(role) {
  return { x: WIDTH / 2, y: role === 'p1' ? HEIGHT - HOME_OFFSET : HOME_OFFSET };
}

export function createTableState() {
  return {
    puck: { x: WIDTH / 2, y: HEIGHT / 2, vx: 0, vy: 0 },
    strikers: {
      p1: { ...strikerHome('p1'), vx: 0, vy: 0 },
      p2: { ...strikerHome('p2'), vx: 0, vy: 0 },
    },
  };
}

// The player who conceded gets the puck on their side, as in real air hockey.
export function resetAfterGoal(state, conceder) {
  state.puck = {
    x: WIDTH / 2,
    y: conceder === 'p1' ? HEIGHT / 2 + 110 : conceder === 'p2' ? HEIGHT / 2 - 110 : HEIGHT / 2,
    vx: 0,
    vy: 0,
  };
  for (const role of ['p1', 'p2']) {
    state.strikers[role] = { ...strikerHome(role), vx: 0, vy: 0 };
  }
}

export function clampStriker(role, pos) {
  const x = Math.max(STRIKER_RADIUS, Math.min(WIDTH - STRIKER_RADIUS, pos.x));
  const y =
    role === 'p1'
      ? Math.max(HEIGHT / 2 + STRIKER_RADIUS, Math.min(HEIGHT - STRIKER_RADIUS, pos.y))
      : Math.max(STRIKER_RADIUS, Math.min(HEIGHT / 2 - STRIKER_RADIUS, pos.y));
  return { x, y };
}

// Which player's half the puck is on (that player simulates it online).
export function puckHalf(puck, current = null, hysteresis = 18) {
  if (current === 'p1' && puck.y > HEIGHT / 2 - hysteresis) return 'p1';
  if (current === 'p2' && puck.y < HEIGHT / 2 + hysteresis) return 'p2';
  return puck.y >= HEIGHT / 2 ? 'p1' : 'p2';
}

export function isInGoalMouth(x) {
  return x > GOAL_LEFT && x < GOAL_RIGHT;
}

function clampSpeed(body, max) {
  const speed = Math.hypot(body.vx, body.vy);
  if (speed > max) {
    body.vx = (body.vx / speed) * max;
    body.vy = (body.vy / speed) * max;
  }
}

function collideStriker(puck, striker, svx, svy) {
  const dx = puck.x - striker.x;
  const dy = puck.y - striker.y;
  const minDist = PUCK_RADIUS + STRIKER_RADIUS;
  const distSq = dx * dx + dy * dy;
  if (distSq >= minDist * minDist) return false;

  const dist = Math.sqrt(distSq) || 0.0001;
  const nx = dx / dist;
  const ny = dy / dist;

  // Separate the bodies; the striker is treated as immovable (infinite mass).
  puck.x = striker.x + nx * (minDist + 0.5);
  puck.y = striker.y + ny * (minDist + 0.5);

  // Reflect the puck's velocity relative to the moving striker.
  const relVx = puck.vx - svx;
  const relVy = puck.vy - svy;
  const along = relVx * nx + relVy * ny;
  if (along < 0) {
    const impulse = -(1 + PHYSICS.STRIKER_RESTITUTION) * along;
    puck.vx += impulse * nx;
    puck.vy += impulse * ny;
  }
  clampSpeed(puck, PHYSICS.MAX_PUCK_SPEED);
  return true;
}

/**
 * Advance the table by `dt` seconds.
 *
 * @param state   { puck, strikers: { p1, p2 } } - mutated in place
 * @param targets { p1?: {x,y}, p2?: {x,y} } where each striker should end up
 * @param dt      seconds (any size; internally split into fixed swept steps)
 * @param options { simulatePuck = true, goals = true }
 * @returns { goal: 'p1' | 'p2' | null, hit: 'p1' | 'p2' | null, wall: boolean }
 *          goal is the player who scored.
 */
export function stepTable(state, targets, dt, { simulatePuck = true, goals = true } = {}) {
  const events = { goal: null, hit: null, wall: false };
  const steps = Math.max(1, Math.round(dt / PHYSICS.STEP));
  const h = dt / steps / PHYSICS.SUBSTEPS;
  const friction = Math.pow(PHYSICS.FRICTION_PER_SECOND, h);

  // Striker paths for this call: straight line from current position to target.
  const paths = {};
  for (const role of ['p1', 'p2']) {
    const striker = state.strikers[role];
    const target = targets[role] ? clampStriker(role, targets[role]) : { x: striker.x, y: striker.y };
    let vx = (target.x - striker.x) / dt;
    let vy = (target.y - striker.y) / dt;
    const speed = Math.hypot(vx, vy);
    if (speed > PHYSICS.MAX_STRIKER_SPEED) {
      vx = (vx / speed) * PHYSICS.MAX_STRIKER_SPEED;
      vy = (vy / speed) * PHYSICS.MAX_STRIKER_SPEED;
    }
    paths[role] = { x0: striker.x, y0: striker.y, x1: target.x, y1: target.y, vx, vy };
  }

  const total = steps * PHYSICS.SUBSTEPS;
  const puck = state.puck;

  for (let i = 1; i <= total; i++) {
    const t = i / total;
    for (const role of ['p1', 'p2']) {
      const p = paths[role];
      state.strikers[role].x = p.x0 + (p.x1 - p.x0) * t;
      state.strikers[role].y = p.y0 + (p.y1 - p.y0) * t;
    }
    if (!simulatePuck || events.goal) continue;

    puck.vx *= friction;
    puck.vy *= friction;
    puck.x += puck.vx * h;
    puck.y += puck.vy * h;

    if (puck.x - PUCK_RADIUS < 0) {
      puck.x = PUCK_RADIUS;
      puck.vx = Math.abs(puck.vx) * PHYSICS.WALL_RESTITUTION;
      events.wall = true;
    } else if (puck.x + PUCK_RADIUS > WIDTH) {
      puck.x = WIDTH - PUCK_RADIUS;
      puck.vx = -Math.abs(puck.vx) * PHYSICS.WALL_RESTITUTION;
      events.wall = true;
    }

    if (puck.y - PUCK_RADIUS < 0) {
      if (goals && isInGoalMouth(puck.x)) {
        events.goal = 'p1';
        continue;
      }
      puck.y = PUCK_RADIUS;
      puck.vy = Math.abs(puck.vy) * PHYSICS.WALL_RESTITUTION;
      events.wall = true;
    } else if (puck.y + PUCK_RADIUS > HEIGHT) {
      if (goals && isInGoalMouth(puck.x)) {
        events.goal = 'p2';
        continue;
      }
      puck.y = HEIGHT - PUCK_RADIUS;
      puck.vy = -Math.abs(puck.vy) * PHYSICS.WALL_RESTITUTION;
      events.wall = true;
    }

    for (const role of ['p1', 'p2']) {
      if (collideStriker(puck, state.strikers[role], paths[role].vx, paths[role].vy)) events.hit = role;
    }
  }

  for (const role of ['p1', 'p2']) {
    state.strikers[role].vx = paths[role].vx;
    state.strikers[role].vy = paths[role].vy;
  }
  return events;
}

// Server-side sanity check for a puck state reported by a client.
export function isPlausiblePuck(next, previous, elapsedSeconds) {
  if (![next.x, next.y, next.vx, next.vy].every(Number.isFinite)) return false;
  if (next.x < -PUCK_RADIUS || next.x > WIDTH + PUCK_RADIUS) return false;
  if (next.y < -PUCK_RADIUS * 2 || next.y > HEIGHT + PUCK_RADIUS * 2) return false;
  if (Math.hypot(next.vx, next.vy) > PHYSICS.MAX_PUCK_SPEED * 1.1) return false;
  if (!previous) return true;
  const maxTravel = PHYSICS.MAX_PUCK_SPEED * Math.min(elapsedSeconds, 0.5) + STRIKER_RADIUS * 2;
  return Math.hypot(next.x - previous.x, next.y - previous.y) <= maxTravel;
}
