// Helix Jump game rules, independent of rendering. Distances are in "game
// pixels" (y grows downward); the 3D scene converts them to world units.

export const GRAVITY = 0.29; // per 60fps frame
export const JUMP_STRENGTH = -7.0;
export const BALL_RADIUS = 14;
export const PLATFORM_SPACING = 180;
export const FIRST_PLATFORM_Y = 250;
export const SMASH_COMBO = 3; // floors passed without bouncing to power up a smash
export const BALL_ANGLE = Math.PI / 2; // the ball sits at the front of the tower

const TWO_PI = Math.PI * 2;
let nextId = 1;

export function generatePlatform(y, difficulty) {
  const segments = [];
  if (difficulty === 0) {
    // Starter floor: one wide gap, no red, placed away from the ball so the
    // idle bounce lands on solid ground until the player starts spinning.
    const gapStart = BALL_ANGLE + 1.6;
    const gapEnd = gapStart + 1.3;
    segments.push({ start: 0, end: gapStart, type: 'safe' });
    segments.push({ start: gapEnd, end: TWO_PI, type: 'safe' });
    return { id: nextId++, y, segments, broken: false, passed: false, brokenAt: 0 };
  }

  const numGaps = difficulty > 4 && Math.random() > 0.5 ? 2 : 1;
  const gapSize = Math.max(0.6, 1.2 - difficulty * 0.04);
  const dangerProb = Math.min(0.6, 0.1 + difficulty * 0.08);
  const sectionArc = TWO_PI / numGaps;

  for (let i = 0; i < numGaps; i++) {
    const sectionStart = i * sectionArc;
    const sectionEnd = (i + 1) * sectionArc;
    const gapStart = sectionStart + 0.1 + Math.random() * (sectionArc - gapSize - 0.2);
    const gapEnd = gapStart + gapSize;

    const addSolid = (start, end) => {
      const width = end - start;
      if (width < 0.1) return;
      if (Math.random() < dangerProb) {
        const dSize = Math.max(0.2, Math.min(width * 0.4, 0.2 + difficulty * 0.05));
        const padding = 0.15;
        if (width < dSize + padding * 2) {
          segments.push({ start, end, type: 'safe' });
          return;
        }
        const dStart = start + padding + Math.random() * (width - dSize - padding * 2);
        const dEnd = dStart + dSize;
        segments.push({ start, end: dStart, type: 'safe' });
        segments.push({ start: dStart, end: dEnd, type: 'danger' });
        segments.push({ start: dEnd, end, type: 'safe' });
      } else {
        segments.push({ start, end, type: 'safe' });
      }
    };
    addSolid(sectionStart, gapStart);
    addSolid(gapEnd, sectionEnd);
  }
  return { id: nextId++, y, segments, broken: false, passed: false, brokenAt: 0 };
}

export function createHelixState() {
  return {
    ballY: 100,
    ballV: 0,
    cameraY: 0,
    towerAngle: 0,
    spinVelocity: 0,
    platforms: [
      generatePlatform(FIRST_PLATFORM_Y, 0),
      generatePlatform(FIRST_PLATFORM_Y + PLATFORM_SPACING, 1),
      generatePlatform(FIRST_PLATFORM_Y + PLATFORM_SPACING * 2, 2),
    ],
    score: 0,
    comboCount: 0,
    difficulty: 2,
    isGameOver: false,
    hasStarted: false,
    time: 0,
  };
}

// Tower-local angle that is currently under the ball.
export function angleUnderBall(towerAngle) {
  return (((BALL_ANGLE - towerAngle) % TWO_PI) + TWO_PI) % TWO_PI;
}

function segmentAt(platform, angle) {
  return platform.segments.find((seg) => angle >= seg.start && angle <= seg.end) || null;
}

/**
 * Advance the game by `dt` seconds.
 * @returns events: { bounce, smash, passed: number[], gameOver, platformsChanged, landedAngle }
 */
export function stepHelix(state, dt, isDragging) {
  const events = { bounce: false, smash: false, passed: [], gameOver: false, platformsChanged: false, landedAngle: null };
  if (state.isGameOver) return events;

  const timeScale = Math.min(dt, 0.1) * 60;
  state.time += dt;

  if (!isDragging) {
    state.spinVelocity *= Math.pow(0.92, timeScale);
    state.towerAngle += state.spinVelocity * timeScale;
  }

  const prevY = state.ballY;
  state.ballV += GRAVITY * timeScale;
  state.ballY += state.ballV * timeScale;

  if (!state.hasStarted) {
    // Idle bounce on the first floor until the player touches the screen.
    const rest = FIRST_PLATFORM_Y - BALL_RADIUS;
    if (state.ballY > rest) {
      state.ballY = rest;
      state.ballV = JUMP_STRENGTH;
      events.bounce = true;
      events.landedAngle = angleUnderBall(state.towerAngle);
    }
    return events;
  }

  const targetCam = state.ballY - 150;
  if (targetCam > state.cameraY) state.cameraY += (targetCam - state.cameraY) * Math.min(1, 0.15 * timeScale);

  const last = state.platforms[state.platforms.length - 1];
  if (state.cameraY + 640 > last.y) {
    state.difficulty += 1;
    state.platforms.push(generatePlatform(last.y + PLATFORM_SPACING, state.difficulty));
    events.platformsChanged = true;
  }

  for (const platform of state.platforms) {
    if (platform.broken) continue;
    const top = platform.y;

    if (prevY + BALL_RADIUS <= top && state.ballY + BALL_RADIUS > top && state.ballV > 0) {
      const angle = angleUnderBall(state.towerAngle);
      const seg = segmentAt(platform, angle);
      if (seg) {
        if (state.comboCount >= SMASH_COMBO) {
          platform.broken = true;
          platform.brokenAt = state.time;
          state.ballV = JUMP_STRENGTH;
          state.score += state.comboCount * 2;
          state.comboCount = 0;
          events.smash = true;
          events.platformsChanged = true;
        } else if (seg.type === 'safe') {
          state.ballV = JUMP_STRENGTH;
          state.ballY = top - BALL_RADIUS;
          state.comboCount = 0;
          events.bounce = true;
          events.landedAngle = angle;
          events.landedPlatform = platform.id;
        } else {
          state.ballY = top - BALL_RADIUS;
          state.isGameOver = true;
          events.gameOver = true;
          return events;
        }
      }
    }

    if (state.ballY > top + 40 && !platform.passed && !platform.broken) {
      platform.passed = true;
      state.comboCount += 1;
      state.score += state.comboCount;
      events.passed.push(state.comboCount);
    }
  }

  // Forget floors far above the camera.
  while (state.platforms.length > 12 && state.platforms[0].y < state.cameraY - 400) {
    state.platforms.shift();
    events.platformsChanged = true;
  }
  return events;
}

export function supportsWebGL() {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
