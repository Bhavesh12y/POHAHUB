const TABLE_WIDTH = 1000;
const TABLE_HEIGHT = 600;
const NET_X = TABLE_WIDTH / 2;         // middle vertical line

const PADDLE_WIDTH = 20;
const PADDLE_HEIGHT = 120;
const BALL_RADIUS = 14;

const TABLE_FRICTION = 0.995;          // slight slowdown, keeps ball alive
const PADDLE_MOMENTUM_FACTOR = 0.4;    // how much paddle motion transfers to the ball
const MAX_BALL_SPEED = 12;
const PADDLE_VELOCITY_DECAY = 0.7;
const MAX_SCORE = 5;

// Fixed paddle X positions – they only move up/down
const PADDLE_P1_X = 80;
const PADDLE_P2_X = TABLE_WIDTH - 80;

export default class TableTennisGame {
  constructor(roomId, io) {
    this.roomId = roomId;
    this.io = io;
    this.players = {};
    this.gameInterval = null;
    this.countdownInterval = null;
    this.destroyTimeout = null;
    this.paddleVelocities = { p1: { vx: 0, vy: 0 }, p2: { vx: 0, vy: 0 } };
    this.resetGameState();
  }

  resetGameState() {
    this.state = {
      status: 'waiting',
      score: { p1: 0, p2: 0 },
      winner: null,
      ball: { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT / 2, vx: 0, vy: 0 },
      paddles: {
        p1: { x: PADDLE_P1_X, y: TABLE_HEIGHT / 2 },
        p2: { x: PADDLE_P2_X, y: TABLE_HEIGHT / 2 },
      },
      dimensions: { width: TABLE_WIDTH, height: TABLE_HEIGHT, netX: NET_X }
    };
    this.paddleVelocities = { p1: { vx: 0, vy: 0 }, p2: { vx: 0, vy: 0 } };
  }

  addPlayer(socketId, playerId) {
    if (this.destroyTimeout) {
      clearTimeout(this.destroyTimeout);
      this.destroyTimeout = null;
    }
    if (this.players[socketId] || Object.keys(this.players).length >= 2) return false;

    const role = Object.keys(this.players).length === 0 ? 'p1' : 'p2';
    this.players[socketId] = { id: playerId, role };
    this.io.to(socketId).emit('tt:role', { role });

    if (Object.keys(this.players).length === 2) {
      this.startCountdown();
    }
    return true;
  }

  removePlayer(socketId) {
    delete this.players[socketId];
    this.state.status = 'waiting';
    this.io.to(this.roomId).emit('tt:playerDisconnected');
    this.destroyTimeout = setTimeout(() => this.destroy(), 10000);
  }

  destroy() {
    if (this.gameInterval) clearInterval(this.gameInterval);
    if (this.countdownInterval) clearInterval(this.countdownInterval);
  }

  broadcastState() {
    this.io.to(this.roomId).emit('tt:gameState', this.state);
  }

  startCountdown() {
    this.state.status = 'countdown';
    if (this.countdownInterval) clearInterval(this.countdownInterval);
    this.resetBall();
    this.broadcastState();

    let count = 3;
    this.countdownInterval = setInterval(() => {
      count--;
      this.io.to(this.roomId).emit('tt:countdown', count);
      if (count === 0) {
        clearInterval(this.countdownInterval);
        this.state.status = 'playing';
        this.startGameLoop();
      }
    }, 1000);
  }

  startGameLoop() {
    if (this.gameInterval) clearInterval(this.gameInterval);
    this.gameInterval = setInterval(() => {
      if (this.state.status !== 'playing') return;
      this.updatePhysics();
      this.broadcastState();
    }, 1000 / 60); // 60 FPS
  }

  updatePhysics() {
    const ball = this.state.ball;

    // No gravity – ball moves in a straight line, with slight friction
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vx *= TABLE_FRICTION;
    ball.vy *= TABLE_FRICTION;

    // Top & bottom wall bounces (table edges)
    if (ball.y - BALL_RADIUS <= 0) {
      ball.vy = Math.abs(ball.vy);
      ball.y = BALL_RADIUS;
    }
    if (ball.y + BALL_RADIUS >= TABLE_HEIGHT) {
      ball.vy = -Math.abs(ball.vy);
      ball.y = TABLE_HEIGHT - BALL_RADIUS;
    }

    // Scoring: ball leaves left/right edge
    if (ball.x + BALL_RADIUS <= 0) {
      this.handleGoal('p2');   // p2 scores when ball exits p1’s left side
    } else if (ball.x - BALL_RADIUS >= TABLE_WIDTH) {
      this.handleGoal('p1');   // p1 scores when ball exits p2’s right side
    }

    // Paddle collisions
    this.checkPaddleCollision('p1');
    this.checkPaddleCollision('p2');
  }

  checkPaddleCollision(role) {
    const paddle = this.state.paddles[role];
    const ball = this.state.ball;
    const vel = this.paddleVelocities[role];

    // Paddle bounding box (vertical thin rectangle)
    const pLeft = paddle.x - PADDLE_WIDTH / 2;
    const pRight = paddle.x + PADDLE_WIDTH / 2;
    const pTop = paddle.y - PADDLE_HEIGHT / 2;
    const pBottom = paddle.y + PADDLE_HEIGHT / 2;

    // Find closest point on paddle to ball centre
    const closestX = Math.max(pLeft, Math.min(ball.x, pRight));
    const closestY = Math.max(pTop, Math.min(ball.y, pBottom));
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    const dist = Math.hypot(dx, dy);

    if (dist < BALL_RADIUS) {
      // Push ball out of paddle
      const overlap = BALL_RADIUS - dist;
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      ball.x += nx * overlap;
      ball.y += ny * overlap;

      // Horizontal reflection (always bounce away from paddle)
      ball.vx = role === 'p1' ? Math.abs(ball.vx) : -Math.abs(ball.vx);

      // Add some vertical momentum based on paddle movement
      ball.vy += (vel.vy || 0) * PADDLE_MOMENTUM_FACTOR;

      // Cap speed
      const speed = Math.hypot(ball.vx, ball.vy);
      if (speed > MAX_BALL_SPEED) {
        ball.vx = (ball.vx / speed) * MAX_BALL_SPEED;
        ball.vy = (ball.vy / speed) * MAX_BALL_SPEED;
      }
    }
  }

  handleGoal(scorer) {
    this.state.score[scorer]++;
    if (this.state.score[scorer] >= MAX_SCORE) {
      this.state.status = 'finished';
      this.state.winner = scorer;
      this.broadcastState();
      if (this.gameInterval) clearInterval(this.gameInterval);
    } else {
      this.startCountdown();
    }
  }

  resetBall() {
    // Random initial direction, reasonable speed
    const angle = (Math.random() * Math.PI / 4) + Math.PI / 6; // 30-75 degrees
    const direction = Math.random() > 0.5 ? 1 : -1;
    const speed = 7;
    this.state.ball = {
      x: TABLE_WIDTH / 2,
      y: TABLE_HEIGHT / 2,
      vx: direction * speed * Math.cos(angle),
      vy: speed * Math.sin(angle) * (Math.random() > 0.5 ? 1 : -1),
    };
  }

  handlePlayerMove(socketId, pos) {
    const player = this.players[socketId];
    if (!player || this.state.status !== 'playing') return;

    // Safety: ignore invalid input
    if (!pos || typeof pos.y !== 'number' || isNaN(pos.y)) return;

    const paddle = this.state.paddles[player.role];
    const oldY = paddle.y;

    // Paddle only moves vertically – fixed X
    const newY = Math.max(PADDLE_HEIGHT / 2, Math.min(TABLE_HEIGHT - PADDLE_HEIGHT / 2, pos.y));
    paddle.y = newY;

    // Track velocity for momentum transfer
    const vel = this.paddleVelocities[player.role];
    vel.vx = 0; // no horizontal movement
    vel.vy = vel.vy * PADDLE_VELOCITY_DECAY + (newY - oldY) * (1 - PADDLE_VELOCITY_DECAY);
  }

  handleRematch() {
    this.resetGameState();
    this.startCountdown();
  }
}