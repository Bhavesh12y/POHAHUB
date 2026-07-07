const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const PUCK_RADIUS = 20;    // Increased for better playability
const STRIKER_RADIUS = 35;
const GOAL_WIDTH = 140;
const MAX_SCORE = 5;

// Damping & physics constants tuned for a snappier feel
const PUCK_DAMPING = 0.995;        // less friction
const STRIKER_MOMENTUM_FACTOR = 0.7; // energy transfer
const MAX_PUCK_SPEED = 20;         // higher cap
const STRIKER_VELOCITY_DECAY = 0.85; // smooth velocity persistence
const MAX_STRIKER_SPEED = 18;

export default class AirHockeyGame {
    constructor(roomId, io) {
        this.roomId = roomId;
        this.io = io;
        this.players = {};
        this.gameInterval = null;
        this.networkInterval = null;
        this.countdownInterval = null;
        this.destroyTimeout = null;

        // Per‑striker smoothed velocity (persistent between move events)
        this.strikerVelocities = { p1: { vx: 0, vy: 0 }, p2: { vx: 0, vy: 0 } };

        this.resetGameState();
    }

    resetGameState() {
        this.state = {
            status: 'waiting',
            score: { p1: 0, p2: 0 },
            winner: null,
            puck: { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, vx: 0, vy: 0 },
            strikers: {
                p1: { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 50 },
                p2: { x: GAME_WIDTH / 2, y: 50 }
            }
        };
        this.strikerVelocities = { p1: { vx: 0, vy: 0 }, p2: { vx: 0, vy: 0 } };
    }

    addPlayer(socketId, playerId) {
        if (this.destroyTimeout) {
            clearTimeout(this.destroyTimeout);
            this.destroyTimeout = null;
        }
        if (this.players[socketId]) return false;
        if (Object.keys(this.players).length >= 2) return false;

        const role = Object.keys(this.players).length === 0 ? 'p1' : 'p2';
        this.players[socketId] = { id: playerId, role };

        this.io.to(socketId).emit('airHockeyRole', { role });

        if (Object.keys(this.players).length === 2) {
            this.startCountdown();
        }
        return true;
    }

    removePlayer(socketId) {
        delete this.players[socketId];
        this.state.status = 'waiting';
        this.io.to(this.roomId).emit('playerDisconnected');

        this.destroyTimeout = setTimeout(() => {
            this.destroy();
        }, 10000);
    }

    destroy() {
        if (this.gameInterval) clearInterval(this.gameInterval);
        if (this.networkInterval) clearInterval(this.networkInterval);
        if (this.countdownInterval) clearInterval(this.countdownInterval);
    }

    broadcastState() {
        this.io.to(this.roomId).emit('gameState', this.state);
    }

    startCountdown() {
        this.state.status = 'countdown';
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        this.resetPuck();
        this.broadcastState();

        let count = 3;
        this.countdownInterval = setInterval(() => {
            count--;
            this.io.to(this.roomId).emit('countdown', count);
            if (count === 0) {
                clearInterval(this.countdownInterval);
                this.state.status = 'playing';
                this.startGameLoop();
            }
        }, 1000);
    }

    startGameLoop() {
        if (this.gameInterval) clearInterval(this.gameInterval);
        if (this.networkInterval) clearInterval(this.networkInterval);

        // Physics now runs at 60 Hz AND broadcasts at 60 Hz – no separate network loop needed.
        // This gives the client the freshest state every frame.
        this.gameInterval = setInterval(() => {
            if (this.state.status !== 'playing') return;
            this.updatePhysics();
            this.broadcastState();           // send state every physics tick (60 Hz)
        }, 1000 / 60);
    }

    updatePhysics() {
        const puck = this.state.puck;

        // Apply low friction
        puck.vx *= PUCK_DAMPING;
        puck.vy *= PUCK_DAMPING;
        puck.x += puck.vx;
        puck.y += puck.vy;

        // Wall bouncing
        if (puck.x - PUCK_RADIUS <= 0) {
            puck.vx = Math.abs(puck.vx);
            puck.x = PUCK_RADIUS;
        } else if (puck.x + PUCK_RADIUS >= GAME_WIDTH) {
            puck.vx = -Math.abs(puck.vx);
            puck.x = GAME_WIDTH - PUCK_RADIUS;
        }

        // Goal detection
        if (puck.y - PUCK_RADIUS <= 0) {
            if (puck.x > GAME_WIDTH / 2 - GOAL_WIDTH / 2 &&
                puck.x < GAME_WIDTH / 2 + GOAL_WIDTH / 2) {
                this.handleGoal('p1');
            } else {
                puck.vy = Math.abs(puck.vy);
                puck.y = PUCK_RADIUS;
            }
        } else if (puck.y + PUCK_RADIUS >= GAME_HEIGHT) {
            if (puck.x > GAME_WIDTH / 2 - GOAL_WIDTH / 2 &&
                puck.x < GAME_WIDTH / 2 + GOAL_WIDTH / 2) {
                this.handleGoal('p2');
            } else {
                puck.vy = -Math.abs(puck.vy);
                puck.y = GAME_HEIGHT - PUCK_RADIUS;
            }
        }

        // Check collision with both strikers
        this.checkStrikerCollision('p1');
        this.checkStrikerCollision('p2');
    }

    checkStrikerCollision(playerRole) {
        const striker = this.state.strikers[playerRole];
        const puck = this.state.puck;
        const vel = this.strikerVelocities[playerRole];  // smoothed velocity

        const dx = puck.x - striker.x;
        const dy = puck.y - striker.y;
        const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 0.01);
        const minDist = PUCK_RADIUS + STRIKER_RADIUS;

        if (distance < minDist) {
            // Push puck out of overlap along the collision normal
            const overlap = minDist - distance;
            const nx = dx / distance;
            const ny = dy / distance;

            puck.x += nx * overlap;
            puck.y += ny * overlap;

            // True geometric reflection of the puck's velocity
            const dotProduct = puck.vx * nx + puck.vy * ny;
            puck.vx = puck.vx - 2 * dotProduct * nx;
            puck.vy = puck.vy - 2 * dotProduct * ny;

            // Add striker momentum using the smoothed velocity
            const strikerSpeed = Math.hypot(vel.vx, vel.vy);
            const clampedSpeed = Math.min(strikerSpeed, MAX_STRIKER_SPEED);
            puck.vx += nx * clampedSpeed * STRIKER_MOMENTUM_FACTOR;
            puck.vy += ny * clampedSpeed * STRIKER_MOMENTUM_FACTOR;

            // Cap overall puck speed (prevents absurd launches)
            const currentSpeed = Math.hypot(puck.vx, puck.vy);
            if (currentSpeed > MAX_PUCK_SPEED) {
                const scale = MAX_PUCK_SPEED / currentSpeed;
                puck.vx *= scale;
                puck.vy *= scale;
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
            this.io.to(this.roomId).emit('gameOver', this.state);
        } else {
            this.io.to(this.roomId).emit('goalAnimation', scorer);
            this.startCountdown();
        }
    }

    resetPuck() {
        this.state.puck = { x: GAME_WIDTH / 2, y: GAME_HEIGHT / 2, vx: 0, vy: 0 };
        this.state.strikers = {
            p1: { x: GAME_WIDTH / 2, y: GAME_HEIGHT - 50 },
            p2: { x: GAME_WIDTH / 2, y: 50 }
        };
    }

    handlePlayerMove(socketId, position) {
        const player = this.players[socketId];
        if (!player || this.state.status !== 'playing') return;

        let { x, y } = position;
        const role = player.role;

        // Clamp to allowed area
        x = Math.max(STRIKER_RADIUS, Math.min(GAME_WIDTH - STRIKER_RADIUS, x));
        if (role === 'p1') {
            y = Math.max(GAME_HEIGHT / 2 + STRIKER_RADIUS, Math.min(GAME_HEIGHT - STRIKER_RADIUS, y));
        } else {
            y = Math.max(STRIKER_RADIUS, Math.min(GAME_HEIGHT / 2 - STRIKER_RADIUS, y));
        }

        const oldPos = this.state.strikers[role];
        // Compute instantaneous delta
        const dx = x - oldPos.x;
        const dy = y - oldPos.y;

        // Update smoothed velocity using exponential moving average
        const vel = this.strikerVelocities[role];
        vel.vx = vel.vx * STRIKER_VELOCITY_DECAY + dx * (1 - STRIKER_VELOCITY_DECAY);
        vel.vy = vel.vy * STRIKER_VELOCITY_DECAY + dy * (1 - STRIKER_VELOCITY_DECAY);

        // Update striker position
        this.state.strikers[role] = { x, y };
    }

    handleRematch() {
        this.resetGameState();
        this.startCountdown();
    }
}