const GAME_WIDTH = 480;
const GAME_HEIGHT = 720;
const PUCK_RADIUS = 22;
const STRIKER_RADIUS = 38;
const GOAL_WIDTH = 160;
const MAX_SCORE = 5;

// --- Real Physics Constants ---
const FRICTION = 0.995;             // Low friction air cushion table
const MAX_PUCK_SPEED = 22;          // Fast, punchy arcade puck speed
const SUB_STEPS = 6;                // 6 physics sub-steps per frame for continuous collision detection (CCD)

export default class AirHockeyGame {
    constructor(roomId, io) {
        this.roomId = roomId;
        this.io = io;
        this.players = {};
        this.gameInterval = null;
        this.networkInterval = null;
        this.countdownInterval = null;
        this.destroyTimeout = null;
        this.resetGameState();
    }

    resetGameState() {
        const centerX = GAME_WIDTH / 2;
        const centerY = GAME_HEIGHT / 2;

        this.state = {
            status: 'waiting',
            score: { p1: 0, p2: 0 },
            winner: null,
            puck: { x: centerX, y: centerY, vx: 0, vy: 0 },
            strikers: {
                p1: { x: centerX, y: GAME_HEIGHT - 80, vx: 0, vy: 0 },
                p2: { x: centerX, y: 80, vx: 0, vy: 0 }
            }
        };

        this.targets = {
            p1: { x: centerX, y: GAME_HEIGHT - 80 },
            p2: { x: centerX, y: 80 }
        };
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
        this.destroyTimeout = setTimeout(() => this.destroy(), 10000);
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

        // 60 Hz physics update loop with 6 sub-steps for precision
        this.gameInterval = setInterval(() => {
            if (this.state.status !== 'playing') return;
            this.updateStrikers();
            
            const dt = 1 / SUB_STEPS;
            for (let s = 0; s < SUB_STEPS; s++) {
                this.updatePhysicsSubstep(dt);
            }
        }, 1000 / 60);

        // 60 Hz high-frequency network broadcast for zero-stutter smoothness
        this.networkInterval = setInterval(() => {
            if (this.state.status !== 'playing') return;
            this.broadcastState();
        }, 1000 / 60);
    }

    updateStrikers() {
        for (const role of ['p1', 'p2']) {
            const striker = this.state.strikers[role];
            const target = this.targets[role];
            const dx = target.x - striker.x;
            const dy = target.y - striker.y;

            // Accurate frame velocity
            striker.vx = dx;
            striker.vy = dy;
            striker.x = target.x;
            striker.y = target.y;
        }
    }

    updatePhysicsSubstep(dt) {
        const puck = this.state.puck;
        const subFriction = Math.pow(FRICTION, dt);

        // Apply friction
        puck.vx *= subFriction;
        puck.vy *= subFriction;

        // Move puck
        puck.x += puck.vx * dt;
        puck.y += puck.vy * dt;

        // Left / Right Walls
        if (puck.x - PUCK_RADIUS <= 0) {
            puck.vx = Math.abs(puck.vx) * 0.98;
            puck.x = PUCK_RADIUS;
        } else if (puck.x + PUCK_RADIUS >= GAME_WIDTH) {
            puck.vx = -Math.abs(puck.vx) * 0.98;
            puck.x = GAME_WIDTH - PUCK_RADIUS;
        }

        // Top Wall and P2 Goal
        const goalLeft = (GAME_WIDTH - GOAL_WIDTH) / 2;
        const goalRight = (GAME_WIDTH + GOAL_WIDTH) / 2;

        if (puck.y - PUCK_RADIUS <= 0) {
            if (puck.x > goalLeft && puck.x < goalRight) {
                this.handleGoal('p1'); // P1 scores
                return;
            } else {
                puck.vy = Math.abs(puck.vy) * 0.98;
                puck.y = PUCK_RADIUS;
            }
        }

        // Bottom Wall and P1 Goal
        if (puck.y + PUCK_RADIUS >= GAME_HEIGHT) {
            if (puck.x > goalLeft && puck.x < goalRight) {
                this.handleGoal('p2'); // P2 scores
                return;
            } else {
                puck.vy = -Math.abs(puck.vy) * 0.98;
                puck.y = GAME_HEIGHT - PUCK_RADIUS;
            }
        }

        // Striker collisions
        this.checkStrikerCollision('p1');
        this.checkStrikerCollision('p2');
    }

    checkStrikerCollision(playerRole) {
        const striker = this.state.strikers[playerRole];
        const puck = this.state.puck;

        let dx = puck.x - striker.x;
        let dy = puck.y - striker.y;
        let distance = Math.hypot(dx, dy) || 0.001;
        const minDist = PUCK_RADIUS + STRIKER_RADIUS;

        if (distance < minDist) {
            let nx = dx / distance;
            let ny = dy / distance;

            // Push puck completely out of striker volume
            const overlap = minDist - distance;
            puck.x += nx * (overlap + 1.5);
            puck.y += ny * (overlap + 1.5);

            // Striker velocity transfer
            const strikerVx = striker.vx;
            const strikerVy = striker.vy;

            // Relative velocity
            const vRelX = puck.vx - strikerVx;
            const vRelY = puck.vy - strikerVy;
            const dot = vRelX * nx + vRelY * ny;

            // If objects are moving towards each other
            if (dot < 0) {
                const elasticity = 1.15; // Crisp, lively elastic strike
                const impulse = -(1 + elasticity) * dot;
                puck.vx += nx * impulse + strikerVx * 0.6;
                puck.vy += ny * impulse + strikerVy * 0.6;

                // Defensive safety: prevent defending striker from deflecting ball into own net
                if (playerRole === 'p1' && puck.vy > -2) {
                    puck.vy = -Math.abs(puck.vy || 4) - 2;
                } else if (playerRole === 'p2' && puck.vy < 2) {
                    puck.vy = Math.abs(puck.vy || 4) + 2;
                }

                // Clamp to maximum puck velocity
                const speed = Math.hypot(puck.vx, puck.vy);
                if (speed > MAX_PUCK_SPEED) {
                    puck.vx = (puck.vx / speed) * MAX_PUCK_SPEED;
                    puck.vy = (puck.vy / speed) * MAX_PUCK_SPEED;
                }
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
            if (this.networkInterval) clearInterval(this.networkInterval);
            this.io.to(this.roomId).emit('gameOver', this.state);
        } else {
            this.io.to(this.roomId).emit('goalAnimation', scorer);
            this.startCountdown();
        }
    }

    resetPuck() {
        const centerX = GAME_WIDTH / 2;
        const centerY = GAME_HEIGHT / 2;
        this.state.puck = { x: centerX, y: centerY, vx: 0, vy: 0 };
        for (const role of ['p1', 'p2']) {
            const y = role === 'p1' ? GAME_HEIGHT - 80 : 80;
            this.state.strikers[role] = { x: centerX, y, vx: 0, vy: 0 };
            this.targets[role] = { x: centerX, y };
        }
    }

    handlePlayerMove(socketId, position) {
        const player = this.players[socketId];
        if (!player || this.state.status !== 'playing') return;

        const role = player.role;
        const x = Math.max(STRIKER_RADIUS, Math.min(GAME_WIDTH - STRIKER_RADIUS, position.x));
        const y = role === 'p1'
            ? Math.max(GAME_HEIGHT / 2 + STRIKER_RADIUS, Math.min(GAME_HEIGHT - STRIKER_RADIUS, position.y))
            : Math.max(STRIKER_RADIUS, Math.min(GAME_HEIGHT / 2 - STRIKER_RADIUS, position.y));

        this.targets[role] = { x, y };
    }
}