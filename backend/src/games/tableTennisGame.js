const TABLE_WIDTH = 600;
const TABLE_HEIGHT = 1000;
const NET_Y = TABLE_HEIGHT / 2;         // middle horizontal line

const PADDLE_WIDTH = 120;
const PADDLE_HEIGHT = 20;
const BALL_RADIUS = 14;

const TABLE_FRICTION = 0.995;          // slight slowdown
const PADDLE_MOMENTUM_FACTOR = 0.4;    // how much paddle motion transfers to the ball
const MAX_BALL_SPEED = 14;
const PADDLE_VELOCITY_DECAY = 0.7;
const MAX_SCORE = 5;

// Fixed paddle Y positions – they only move left/right
const PADDLE_P1_Y = 80;                // Top
const PADDLE_P2_Y = TABLE_HEIGHT - 80; // Bottom

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
        p1: { x: TABLE_WIDTH / 2, y: PADDLE_P1_Y },
        p2: { x: TABLE_WIDTH / 2, y: PADDLE_P2_Y },
      },
      dimensions: { width: TABLE_WIDTH, height: TABLE_HEIGHT, netY: NET_Y }
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

    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vx *= TABLE_FRICTION;
    ball.vy *= TABLE_FRICTION;

    // Left & Right wall bounces (table edges)
    if (ball.x - BALL_RADIUS <= 0) {
      ball.vx = Math.abs(ball.vx);
      ball.x = BALL_RADIUS;
    }
    if (ball.x + BALL_RADIUS >= TABLE_WIDTH) {
      ball.vx = -Math.abs(ball.vx);
      ball.x = TABLE_WIDTH - BALL_RADIUS;
    }

    // Scoring: ball leaves top/bottom edge
    if (ball.y + BALL_RADIUS <= 0) {
      this.handleGoal('p2');   // p2 scores when ball passes p1 (top)
    } else if (ball.y - BALL_RADIUS >= TABLE_HEIGHT) {
      this.handleGoal('p1');   // p1 scores when ball passes p2 (bottom)
    }

    // Paddle collisions
    this.checkPaddleCollision('p1');
    this.checkPaddleCollision('p2');
  }

  checkPaddleCollision(role) {
    const paddle = this.state.paddles[role];
    const ball = this.state.ball;
    const vel = this.paddleVelocities[role];

    const pLeft = paddle.x - PADDLE_WIDTH / 2;
    const pRight = paddle.x + PADDLE_WIDTH / 2;
    const pTop = paddle.y - PADDLE_HEIGHT / 2;
    const pBottom = paddle.y + PADDLE_HEIGHT / 2;

    const closestX = Math.max(pLeft, Math.min(ball.x, pRight));
    const closestY = Math.max(pTop, Math.min(ball.y, pBottom));
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    const dist = Math.hypot(dx, dy);

    if (dist < BALL_RADIUS) {
      const overlap = BALL_RADIUS - dist;
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      ball.x += nx * overlap;
      ball.y += ny * overlap;

      // Vertical reflection (always bounce away from paddle)
      ball.vy = role === 'p1' ? Math.abs(ball.vy) : -Math.abs(ball.vy);

      // Add horizontal momentum based on paddle drag
      ball.vx += (vel.vx || 0) * PADDLE_MOMENTUM_FACTOR;

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
    // Serve vertically towards a player
    const speed = 7;
    const directionY = Math.random() > 0.5 ? 1 : -1;
    // Slight random X velocity between -3 and 3
    const vx = (Math.random() - 0.5) * 6;
    const vy = directionY * Math.sqrt(speed * speed - vx * vx);
    
    this.state.ball = {
      x: TABLE_WIDTH / 2,
      y: TABLE_HEIGHT / 2,
      vx: vx,
      vy: vy,
    };
  }

  handlePlayerMove(socketId, pos) {
    const player = this.players[socketId];
    if (!player || this.state.status !== 'playing') return;

    // Safety: ignore invalid input
    if (!pos || typeof pos.x !== 'number' || isNaN(pos.x)) return;

    const paddle = this.state.paddles[player.role];
    const oldX = paddle.x;

    // Paddle only moves horizontally – fixed Y
    const newX = Math.max(PADDLE_WIDTH / 2, Math.min(TABLE_WIDTH - PADDLE_WIDTH / 2, pos.x));
    paddle.x = newX;

    // Track velocity for momentum transfer
    const vel = this.paddleVelocities[player.role];
    vel.vy = 0; 
    vel.vx = vel.vx * PADDLE_VELOCITY_DECAY + (newX - oldX) * (1 - PADDLE_VELOCITY_DECAY);
  }

  handleRematch() {
    this.resetGameState();
    this.startCountdown();
  }
}