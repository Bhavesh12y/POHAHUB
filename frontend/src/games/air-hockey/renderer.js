// Canvas renderer shared by online, local and bot air hockey.
// The static table and the glowing pieces are drawn once to offscreen canvases;
// each frame only blits images, which keeps it smooth on low-end phones.
import { TABLE } from '@engines/airHockeyPhysics.js';

const { WIDTH, HEIGHT, PUCK_RADIUS, STRIKER_RADIUS, GOAL_WIDTH } = TABLE;
export const P1_COLOR = '#3b82f6';
export const P2_COLOR = '#ef4444';

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function drawGoalHole(ctx, y, color) {
  const cx = WIDTH / 2;
  const halfW = GOAL_WIDTH / 2;
  const depth = 22;
  const cavity = ctx.createRadialGradient(cx, y, 3, cx, y, halfW);
  cavity.addColorStop(0, '#020617');
  cavity.addColorStop(0.55, '#0f172a');
  cavity.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.beginPath();
  ctx.ellipse(cx, y, halfW, depth, 0, 0, Math.PI * 2);
  ctx.fillStyle = cavity;
  ctx.fill();

  ctx.save();
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;
  ctx.strokeStyle = `${color}88`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, y, halfW - 3, depth - 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  ctx.strokeStyle = 'rgba(226,232,240,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(cx, y, halfW, depth, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function buildTable(dpr) {
  const canvas = makeCanvas(WIDTH * dpr, HEIGHT * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const bg = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  bg.addColorStop(0, '#0b1220');
  bg.addColorStop(0.5, '#111827');
  bg.addColorStop(1, '#0b1220');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const vignette = ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, HEIGHT * 0.15, WIDTH / 2, HEIGHT / 2, HEIGHT * 0.7);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.save();
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#22d3ee';
  ctx.strokeStyle = 'rgba(34,211,238,0.75)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(12, HEIGHT / 2);
  ctx.lineTo(WIDTH - 12, HEIGHT / 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.arc(WIDTH / 2, HEIGHT / 2, 55, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(WIDTH / 2, HEIGHT / 2, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#22d3ee';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, WIDTH - 8, HEIGHT - 8);

  drawGoalHole(ctx, 0, P2_COLOR);
  drawGoalHole(ctx, HEIGHT, P1_COLOR);
  return canvas;
}

function buildStriker(color, dpr) {
  const pad = 26;
  const size = (STRIKER_RADIUS + pad) * 2;
  const canvas = makeCanvas(size * dpr, size * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const c = size / 2;
  ctx.shadowBlur = 22;
  ctx.shadowColor = color;
  const grad = ctx.createRadialGradient(c - 8, c - 8, 4, c, c, STRIKER_RADIUS);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, color);
  ctx.beginPath();
  ctx.arc(c, c, STRIKER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#0f172a';
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(c, c, STRIKER_RADIUS * 0.45, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(15,23,42,0.35)';
  ctx.lineWidth = 2;
  ctx.stroke();
  return { canvas, size };
}

function buildPuck(dpr) {
  const pad = 24;
  const size = (PUCK_RADIUS + pad) * 2;
  const canvas = makeCanvas(size * dpr, size * dpr);
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  const c = size / 2;
  ctx.shadowBlur = 26;
  ctx.shadowColor = '#38bdf8';
  const grad = ctx.createRadialGradient(c - 5, c - 5, 1, c, c, PUCK_RADIUS);
  grad.addColorStop(0, '#334155');
  grad.addColorStop(1, '#020617');
  ctx.beginPath();
  ctx.arc(c, c, PUCK_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.shadowBlur = 14;
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#38bdf8';
  ctx.stroke();
  return { canvas, size };
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let dpr = 1;
  let sprites = null;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(WIDTH * dpr);
    canvas.height = Math.round(HEIGHT * dpr);
    sprites = {
      table: buildTable(dpr),
      p1: buildStriker(P1_COLOR, dpr),
      p2: buildStriker(P2_COLOR, dpr),
      puck: buildPuck(dpr),
    };
  }

  function blit(sprite, x, y, scale = 1, alpha = 1) {
    const s = sprite.size * scale;
    ctx.globalAlpha = alpha;
    ctx.drawImage(sprite.canvas, x - s / 2, y - s / 2, s, s);
    ctx.globalAlpha = 1;
  }

  /**
   * @param frame.puck      {x,y} or null
   * @param frame.strikers  { p1: {x,y}, p2: {x,y} }
   * @param frame.flip      rotate 180deg so p2 sees their goal at the bottom
   * @param frame.trail     [{x,y}] recent puck positions
   * @param frame.drop      {x,y,progress} goal "falling in the hole" animation
   */
  function draw({ puck, strikers, flip = false, trail = [], drop = null }) {
    if (!sprites) resize();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (flip) {
      ctx.translate(WIDTH, HEIGHT);
      ctx.rotate(Math.PI);
    }
    ctx.drawImage(sprites.table, 0, 0, WIDTH, HEIGHT);

    for (let i = 0; i < trail.length; i++) {
      const t = (i + 1) / trail.length;
      ctx.beginPath();
      ctx.fillStyle = `rgba(148, 197, 255, ${t * 0.22})`;
      ctx.arc(trail[i].x, trail[i].y, PUCK_RADIUS * (0.35 + 0.5 * t), 0, Math.PI * 2);
      ctx.fill();
    }

    if (strikers?.p1) blit(sprites.p1, strikers.p1.x, strikers.p1.y);
    if (strikers?.p2) blit(sprites.p2, strikers.p2.x, strikers.p2.y);

    if (drop) blit(sprites.puck, drop.x, drop.y, Math.max(0.01, 1 - drop.progress), 1 - drop.progress);
    else if (puck) blit(sprites.puck, puck.x, puck.y);
  }

  resize();
  return { draw, resize };
}

// Pointer position in table coordinates. Uses bounding-rect ratios, so it stays
// correct under CSS transforms, the desktop zoom and any canvas display size.
export function pointerToTable(event, canvas, flip = false) {
  const rect = canvas.getBoundingClientRect();
  let x = ((event.clientX - rect.left) / rect.width) * WIDTH;
  let y = ((event.clientY - rect.top) / rect.height) * HEIGHT;
  if (flip) {
    x = WIDTH - x;
    y = HEIGHT - y;
  }
  return { x, y };
}
