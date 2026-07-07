const TABLE_WIDTH = 800;
const TABLE_HEIGHT = 500;
const NET_X = TABLE_WIDTH / 2;
const NET_HEIGHT = 40;
const NET_Y = TABLE_HEIGHT - NET_HEIGHT;

const PADDLE_WIDTH = 15;
const PADDLE_HEIGHT = 100;
const BALL_RADIUS = 10;
const GRAVITY = 0.3;
const TABLE_FRICTION = 0.98;
const BOUNCE_DAMPING = 0.85;
const PADDLE_MOMENTUM_FACTOR = 0.5;
const MAX_BALL_SPEED = 20;
const PADDLE_VELOCITY_DECAY = 0.7;
const MAX_SCORE = 5;

export default class TableTennisGame {
    constructor(roomId, io) {
        this.roomId = roomId;
        this.io = io;
        this.players = {};
        this.gameInterval = null;
        this.countdownInterval = null;
        this.destroyTimeout = null;
        this.paddleVelocities = { p1: { vy: 0 }, p2: { vy: 0 } };
        this.resetGameState();
    }

    resetGameState() {
        this.state = {
            status: 'waiting',
            score: { p1: 0, p2: 0 },
            winner: null,
            ball: { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT / 4, vx: 0, vy: 0 },
            paddles: {
                p1: { x: 50, y: TABLE_HEIGHT / 2 },
                p2: { x: TABLE_WIDTH - 50, y: TABLE_HEIGHT / 2 },
            },
            dimensions: { width: TABLE_WIDTH, height: TABLE_HEIGHT, netY: NET_Y, netHeight: NET_HEIGHT }
        };
        this.paddleVelocities = { p1: { vy: 0 }, p2: { vy: 0 } };
    }

    addPlayer(socketId, playerId) {
        if (this.destroyTimeout) {
            clearTimeout(this.destroyTimeout);
            this.destroyTimeout = null;
        }
        if (this.players[socketId] || Object.keys(this.players).length >= 2) return false;

        const role = Object.keys(this.players).length === 0 ? 'p1' : 'p2';
        this.players[socketId] = { id: playerId, role };
        
        // Tell the client which paddle they control
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
        }, 1000 / 60); // 60 FPS tick rate
    }

    updatePhysics() {
        const ball = this.state.ball;

        // Apply Gravity
        ball.vy += GRAVITY;
        ball.x += ball.vx;
        ball.y += ball.vy;

        // Floor Bounce
        if (ball.y + BALL_RADIUS >= TABLE_HEIGHT) {
            ball.vy = -Math.abs(ball.vy) * BOUNCE_DAMPING;
            ball.y = TABLE_HEIGHT - BALL_RADIUS;
            ball.vx *= TABLE_FRICTION;
        }

        // Ceiling Bounce
        if (ball.y - BALL_RADIUS <= 0) {
            ball.vy = Math.abs(ball.vy);
            ball.y = BALL_RADIUS;
        }

        // Net Collision
        if (ball.x > NET_X - 5 && ball.x < NET_X + 5 && ball.y + BALL_RADIUS > NET_Y) {
            ball.vx *= -0.5;
            ball.vy = -Math.abs(ball.vy) * 0.5;
            ball.x = ball.vx > 0 ? NET_X + 6 : NET_X - 6;
        }

        // Scoring Rules
        if (ball.x - BALL_RADIUS <= 0 && ball.y > NET_Y) this.handleGoal('p2');
        else if (ball.x + BALL_RADIUS >= TABLE_WIDTH && ball.y > NET_Y) this.handleGoal('p1');
        else if (ball.x < -100) this.handleGoal('p2'); // Flew off screen entirely
        else if (ball.x > TABLE_WIDTH + 100) this.handleGoal('p1');

        this.checkPaddleCollision('p1');
        this.checkPaddleCollision('p2');
    }

    checkPaddleCollision(role) {
        const paddle = this.state.paddles[role];
        const ball = this.state.ball;
        const vel = this.paddleVelocities[role];

        // Prevent hitting ball from behind
        if ((role === 'p1' && ball.vx > 0) || (role === 'p2' && ball.vx < 0)) return;

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
            ball.vx = role === 'p1' ? Math.abs(ball.vx) : -Math.abs(ball.vx);
            ball.vy += (vel.vy || 0) * PADDLE_MOMENTUM_FACTOR;

            // Enforce minimum speed so the game doesn't stall, and max speed for sanity
            const speed = Math.hypot(ball.vx, ball.vy);
            const targetSpeed = Math.max(10, Math.min(speed + 2, MAX_BALL_SPEED));
            ball.vx = (ball.vx / speed) * targetSpeed;
            ball.vy = (ball.vy / speed) * targetSpeed;
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
        const direction = Math.random() > 0.5 ? 1 : -1;
        this.state.ball = { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT / 3, vx: direction * 6, vy: -4 };
    }

    handlePlayerMove(socketId, yPos) {
        const player = this.players[socketId];
        if (!player || this.state.status !== 'playing') return;

        const paddle = this.state.paddles[player.role];
        const newY = Math.max(PADDLE_HEIGHT / 2, Math.min(TABLE_HEIGHT - PADDLE_HEIGHT / 2, yPos));
        
        const oldY = paddle.y;
        paddle.y = newY;

        const vel = this.paddleVelocities[player.role];
        vel.vy = vel.vy * PADDLE_VELOCITY_DECAY + (newY - oldY) * (1 - PADDLE_VELOCITY_DECAY);
    }

    handleRematch() {
        this.resetGameState();
        this.startCountdown();
    }
}