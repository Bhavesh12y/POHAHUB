// Air hockey computer opponent. It plays the top striker (p2) by choosing where
// to move each frame; the shared physics decides what actually happens.
import { TABLE, clampStriker, strikerHome } from '@engines/airHockeyPhysics.js';

const { WIDTH, HEIGHT, PUCK_RADIUS, STRIKER_RADIUS } = TABLE;

const LEVELS = {
  easy: { speed: 520, reaction: 0.22, attackSpeed: 260, predict: false, aimJitter: 90 },
  medium: { speed: 900, reaction: 0.12, attackSpeed: 380, predict: true, aimJitter: 50 },
  hard: { speed: 1400, reaction: 0.05, attackSpeed: 520, predict: true, aimJitter: 25 },
};

// Where will the puck cross `lineY`, accounting for side-wall bounces?
function predictX(puck, lineY) {
  if (Math.abs(puck.vy) < 1) return puck.x;
  const t = (lineY - puck.y) / puck.vy;
  if (t < 0) return puck.x;
  const span = WIDTH - PUCK_RADIUS * 2;
  let x = puck.x - PUCK_RADIUS + puck.vx * t;
  x = ((x % (span * 2)) + span * 2) % (span * 2);
  if (x > span) x = span * 2 - x;
  return x + PUCK_RADIUS;
}

export function createAirHockeyBot(difficulty = 'medium') {
  const level = LEVELS[difficulty] || LEVELS.medium;
  let seen = null;
  let sinceLook = Infinity;
  let aimOffset = 0;
  let position = strikerHome('p2');

  return {
    reset() {
      seen = null;
      sinceLook = Infinity;
      position = strikerHome('p2');
    },
    /** Returns the striker target for this frame. */
    update(state, dt) {
      sinceLook += dt;
      if (!seen || sinceLook >= level.reaction) {
        seen = { ...state.puck };
        sinceLook = 0;
      } else {
        // Between "looks" the bot extrapolates what it last saw.
        seen.x += seen.vx * dt;
        seen.y += seen.vy * dt;
      }

      const puck = seen;
      const onMySide = puck.y < HEIGHT / 2;
      const speed = Math.hypot(puck.vx, puck.vy);
      let target;

      if (onMySide && (speed < level.attackSpeed || puck.vy < 0)) {
        // Attack: get behind the puck, then drive through it towards the goal.
        const goal = { x: WIDTH / 2 + aimOffset, y: HEIGHT + 40 };
        const dx = goal.x - puck.x;
        const dy = goal.y - puck.y;
        const len = Math.hypot(dx, dy) || 1;
        const dirX = dx / len;
        const dirY = dy / len;
        const behind = {
          x: puck.x - dirX * (PUCK_RADIUS + STRIKER_RADIUS + 6),
          y: puck.y - dirY * (PUCK_RADIUS + STRIKER_RADIUS + 6),
        };
        const lined = position.y < puck.y - 10 && Math.hypot(position.x - behind.x, position.y - behind.y) < 30;
        target = lined ? { x: puck.x + dirX * 40, y: puck.y + dirY * 40 } : behind;
      } else {
        // Defend: sit between the puck and our goal.
        const guardY = 90;
        const x = level.predict && puck.vy < 0 ? predictX(puck, guardY) : puck.x;
        target = { x: WIDTH / 2 + (x - WIDTH / 2) * 0.75, y: guardY };
        aimOffset = (Math.random() - 0.5) * 2 * level.aimJitter;
      }

      target = clampStriker('p2', target);
      const mx = target.x - position.x;
      const my = target.y - position.y;
      const dist = Math.hypot(mx, my);
      const step = level.speed * dt;
      position =
        dist <= step ? target : { x: position.x + (mx / dist) * step, y: position.y + (my / dist) * step };
      return position;
    },
  };
}
