const TABLE_WIDTH = 1000;
const TABLE_HEIGHT = 600;
const NET_X = TABLE_WIDTH / 2;
const NET_HEIGHT = 50;
const NET_Y = TABLE_HEIGHT - NET_HEIGHT;

const PADDLE_WIDTH = 20;
const PADDLE_HEIGHT = 120;
const BALL_RADIUS = 14;    

const GRAVITY = 0.2;               
const TABLE_FRICTION = 0.98;
const BOUNCE_DAMPING = 0.8;
const PADDLE_MOMENTUM_FACTOR = 0.4; 
const MAX_BALL_SPEED = 15;         
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
        this.paddleVelocities = { p1: { vx: 0, vy: 0 }, p2: { vx: 0, vy: 0 } };
        this.resetGameState();
    }

    resetGameState() {
        this.state = {
            status: 'waiting',
            score: { p1: 0, p2: 0 },
            winner: null,
            ball: { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT / 4, vx: 0, vy: 0 },
            paddles: {
                p1: { x: 100, y: TABLE_HEIGHT / 2 },
                p2: { x: TABLE_WIDTH - 100, y: TABLE_HEIGHT / 2 },
            },
            dimensions: { width: TABLE_WIDTH, height: TABLE_HEIGHT, netY: NET_Y, netHeight: NET_HEIGHT }
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
        }, 1000 / 60); 
    }

    updatePhysics() {
        const ball = this.state.ball;

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
        if (ball.x > NET_X - 6 && ball.x < NET_X + 6 && ball.y + BALL_RADIUS > NET_Y) {
            ball.vx *= -0.5;
            ball.vy = -Math.abs(ball.vy) * 0.5;
            ball.x = ball.vx > 0 ? NET_X + 7 : NET_X - 7;
        }

        // Scoring Rules
        if (ball.x - BALL_RADIUS <= 0 && ball.y > NET_Y) this.handleGoal('p2');
        else if (ball.x + BALL_RADIUS >= TABLE_WIDTH && ball.y > NET_Y) this.handleGoal('p1');
        else if (ball.x < -150) this.handleGoal('p2'); // Added buffer to prevent fast-ball misses
        else if (ball.x > TABLE_WIDTH + 150) this.handleGoal('p1');

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
            // Push ball out of paddle
            const overlap = BALL_RADIUS - dist;
            const nx = dx / (dist || 1);
            const ny = dy / (dist || 1);
            ball.x += nx * overlap;
            ball.y += ny * overlap;

            // Reflect horizontally
            ball.vx = role === 'p1' ? Math.abs(ball.vx) : -Math.abs(ball.vx);
            
            // Add Paddle Momentum
            ball.vx += (vel.vx || 0) * PADDLE_MOMENTUM_FACTOR;
            ball.vy += (vel.vy || 0) * PADDLE_MOMENTUM_FACTOR;

            const speed = Math.hypot(ball.vx, ball.vy);
            const targetSpeed = Math.max(8, Math.min(speed, MAX_BALL_SPEED));
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
        this.state.ball = { x: TABLE_WIDTH / 2, y: TABLE_HEIGHT / 4, vx: direction * 5, vy: -3 };
    }

    handlePlayerMove(socketId, pos) {
        const player = this.players[socketId];
        if (!player || this.state.status !== 'playing') return;

        // CRITICAL FIX: Protect against NaN crashing the physics engine
        if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number' || isNaN(pos.x) || isNaN(pos.y)) {
            return; 
        }

        const paddle = this.state.paddles[player.role];
        
        // 1. Clamp Y Axis
        const newY = Math.max(PADDLE_HEIGHT / 2, Math.min(TABLE_HEIGHT - PADDLE_HEIGHT / 2, pos.y));
        
        // 2. Clamp X Axis (Keep them on their own side of the net)
        let newX;
        if (player.role === 'p1') {
            newX = Math.max(PADDLE_WIDTH / 2, Math.min(NET_X - PADDLE_WIDTH / 2 - 20, pos.x));
        } else {
            newX = Math.max(NET_X + PADDLE_WIDTH / 2 + 20, Math.min(TABLE_WIDTH - PADDLE_WIDTH / 2, pos.x));
        }
        
        const oldX = paddle.x;
        const oldY = paddle.y;
        
        paddle.x = newX;
        paddle.y = newY;

        const vel = this.paddleVelocities[player.role];
        vel.vx = vel.vx * PADDLE_VELOCITY_DECAY + (newX - oldX) * (1 - PADDLE_VELOCITY_DECAY);
        vel.vy = vel.vy * PADDLE_VELOCITY_DECAY + (newY - oldY) * (1 - PADDLE_VELOCITY_DECAY);
    }

    handleRematch() {
        this.resetGameState();
        this.startCountdown();
    }
}