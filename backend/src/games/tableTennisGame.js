const GAME_WIDTH = 1000;
const GAME_HEIGHT = 600;

// Physics Constants
const GRAVITY = 0.35;
const AIR_FRICTION = 0.995;
const TABLE_BOUNCE = 0.85;       // Energy retained when hitting the table
const RACKET_POWER = 0.5;        // How much paddle speed transfers to ball
const MAX_BALL_SPEED = 22;

const BALL_RADIUS = 12;
const RACKET_RADIUS = 40;        // Circular hitbox for angled shots

// Environment Bounds
const TABLE_Y = 450;             // Height of the table surface
const TABLE_LEFT = 100;
const TABLE_RIGHT = 900;
const NET_X = GAME_WIDTH / 2;
const NET_TOP = 370;             // Top of the net

const MAX_SCORE = 5;

export default class TableTennisGame {
  constructor(roomId, io) {
    this.roomId = roomId;
    this.io = io;
    this.players = {};
    this.gameInterval = null;
    this.countdownInterval = null;
    this.destroyTimeout = null;
    
    // Store previous positions to calculate swing velocity
    this.prevPaddles = { 
      p1: { x: 150, y: 300 }, 
      p2: { x: 850, y: 300 } 
    };
    
    this.resetGameState();
  }

  resetGameState() {
    this.state = {
      status: 'waiting',
      score: { p1: 0, p2: 0 },
      winner: null,
      ball: { x: GAME_WIDTH / 2, y: 100, vx: 0, vy: 0 },
      paddles: {
        p1: { x: 150, y: 300 },
        p2: { x: 850, y: 300 },
      },
      dimensions: { width: GAME_WIDTH, height: GAME_HEIGHT }
    };
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
      
      // Update previous positions for velocity calculation next frame
      this.prevPaddles.p1 = { ...this.state.paddles.p1 };
      this.prevPaddles.p2 = { ...this.state.paddles.p2 };
    }, 1000 / 60);
  }

  updatePhysics() {
    const ball = this.state.ball;

    // FIX: Store the old Y position to detect tunneling through the table
    const oldY = ball.y;

    // 1. Apply Gravity & Friction
    ball.vy += GRAVITY;
    ball.x += ball.vx;
    ball.y += ball.vy;
    ball.vx *= AIR_FRICTION;
    ball.vy *= AIR_FRICTION;

    // 2. Wall Bounces (Left/Right Ceilings)
    if (ball.x - BALL_RADIUS <= 0) {
      ball.vx = Math.abs(ball.vx);
      ball.x = BALL_RADIUS;
    }
    if (ball.x + BALL_RADIUS >= GAME_WIDTH) {
      ball.vx = -Math.abs(ball.vx);
      ball.x = GAME_WIDTH - BALL_RADIUS;
    }
    if (ball.y - BALL_RADIUS <= 0) {
      ball.vy = Math.abs(ball.vy);
      ball.y = BALL_RADIUS;
    }

    // 3. Table Collision (FIX: Continuous Swept Collision)
    // We check if the ball *passed through* the table threshold between frames
    if (oldY + BALL_RADIUS <= TABLE_Y && ball.y + BALL_RADIUS >= TABLE_Y) {
      if (ball.x > TABLE_LEFT && ball.x < TABLE_RIGHT) {
        ball.y = TABLE_Y - BALL_RADIUS; // Snap it back to the exact surface
        ball.vy = -Math.abs(ball.vy) * TABLE_BOUNCE;
      }
    }

    // 4. Net Collision
    if (ball.x + BALL_RADIUS > NET_X - 5 && ball.x - BALL_RADIUS < NET_X + 5) {
      if (ball.y > NET_TOP && ball.y < TABLE_Y) {
        // Bounce horizontally off the net
        ball.vx = ball.x < NET_X ? -Math.abs(ball.vx) : Math.abs(ball.vx);
      } else if (ball.y + BALL_RADIUS > NET_TOP - 5 && ball.y < NET_TOP + 5) {
        // Hit the very top of the net, bounce up
        ball.vy = -Math.abs(ball.vy) * 0.8;
      }
    }

    // 5. Floor Collision (Scoring)
    if (ball.y > GAME_HEIGHT + BALL_RADIUS) {
      // If it drops on the left side, P2 scores. If right side, P1 scores.
      if (ball.x < NET_X) {
        this.handleGoal('p2');
      } else {
        this.handleGoal('p1');
      }
    }

    // 6. Racket Collisions
    this.checkRacketCollision('p1');
    this.checkRacketCollision('p2');
  }

  checkRacketCollision(role) {
    const racket = this.state.paddles[role];
    const prev = this.prevPaddles[role];
    const ball = this.state.ball;

    // Calculate racket velocity (how fast player swung)
    const rVx = racket.x - prev.x;
    const rVy = racket.y - prev.y;

    // Distance between ball center and racket center
    const dx = ball.x - racket.x;
    const dy = ball.y - racket.y;
    const dist = Math.hypot(dx, dy);

    if (dist < BALL_RADIUS + RACKET_RADIUS) {
      // Push ball out of the racket to prevent getting stuck
      const overlap = (BALL_RADIUS + RACKET_RADIUS) - dist;
      const nx = dx / (dist || 1);
      const ny = dy / (dist || 1);
      
      ball.x += nx * overlap;
      ball.y += ny * overlap;

      // Calculate new bounce based on the angle of impact
      // This allows players to smash (hit from above) or lob (hit from below)
      const speed = Math.hypot(ball.vx, ball.vy);
      const newSpeed = Math.min(speed * 0.8 + Math.hypot(rVx, rVy) * RACKET_POWER, MAX_BALL_SPEED);
      
      ball.vx = nx * newSpeed;
      ball.vy = ny * newSpeed;
      
      // Ensure the ball moves forward across the net
      if (role === 'p1' && ball.vx < 2) ball.vx = 4;
      if (role === 'p2' && ball.vx > -2) ball.vx = -4;
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
    // Drop the ball from the ceiling, slightly towards the loser of the last point (or random)
    const side = Math.random() > 0.5 ? -100 : 100;
    this.state.ball = {
      x: (GAME_WIDTH / 2) + side,
      y: 50,
      vx: 0,
      vy: 2, // gentle drop
    };
  }

  handlePlayerMove(socketId, pos) {
    const player = this.players[socketId];
    if (!player || this.state.status !== 'playing') return;
    if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') return;

    const racket = this.state.paddles[player.role];

    // Constrain players to their side of the net and within the screen
    if (player.role === 'p1') {
      racket.x = Math.max(RACKET_RADIUS, Math.min(NET_X - RACKET_RADIUS, pos.x));
    } else {
      racket.x = Math.max(NET_X + RACKET_RADIUS, Math.min(GAME_WIDTH - RACKET_RADIUS, pos.x));
    }
    
    racket.y = Math.max(RACKET_RADIUS, Math.min(GAME_HEIGHT - RACKET_RADIUS, pos.y));
  }

  handleRematch() {
    this.resetGameState();
    this.startCountdown();
  }
}