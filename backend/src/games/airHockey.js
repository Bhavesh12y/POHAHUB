const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const PUCK_RADIUS = 20;
const STRIKER_RADIUS = 35;
const GOAL_WIDTH = 140;
const MAX_SCORE = 5;

// --- Simulation Constants ---
const FRICTION = 0.988;             // per tick at 60 Hz
const MAX_PUCK_SPEED = 24;          // max puck velocity in pixels per tick
const SUB_STEPS = 4;                // 4 physics sub-steps per frame for continuous collision

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
                p1: { x: centerX, y: GAME_HEIGHT - 60, vx: 0, vy: 0 },
                p2: { x: centerX, y: 60, vx: 0, vy: 0 }
            }
        };

        this.targets = {
            p1: { x: centerX, y: GAME_HEIGHT - 60 },
            p2: { x: centerX, y: 60 }
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

        // 60 Hz physics loop with 4 sub-steps
        this.gameInterval = setInterval(() => {
            if (this.state.status !== 'playing') return;
            this.updateStrikers();
            
            const dt = 1 / SUB_STEPS;
            for (let s = 0; s < SUB_STEPS; s++) {
                this.updatePhysicsSubstep(dt);
            }
        }, 1000 / 60);

        // High frequency 45 Hz network broadcast for low-latency smoothness
        this.networkInterval = setInterval(() => {
            if (this.state.status !== 'playing') return;
            this.broadcastState();
        }, 1000 / 45);
    }

    // Direct, instant response: mallet follows touch with instantaneous velocity calculation
    updateStrikers() {
        for (const role of ['p1', 'p2']) {
            const striker = this.state.strikers[role];
            const target = this.targets[role];
            const dx = target.x - striker.x;
            const dy = target.y - striker.y;

            // Velocity is exact frame-by-frame displacement
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

        // Move puck by delta
        puck.x += puck.vx * dt;
        puck.y += puck.vy * dt;

        // Wall collisions (left/right)
        if (puck.x - PUCK_RADIUS <= 0) {
            puck.vx = Math.abs(puck.vx) * 0.98;
            puck.x = PUCK_RADIUS;
        } else if (puck.x + PUCK_RADIUS >= GAME_WIDTH) {
            puck.vx = -Math.abs(puck.vx) * 0.98;
            puck.x = GAME_WIDTH - PUCK_RADIUS;
        }

        // Top wall and P2's goal
        if (puck.y - PUCK_RADIUS <= 0) {
            const inGoal = puck.x > GAME_WIDTH / 2 - GOAL_WIDTH / 2 && puck.x < GAME_WIDTH / 2 + GOAL_WIDTH / 2;
            if (inGoal) {
                this.handleGoal('p1'); // p1 scored
                return;
            } else {
                puck.vy = Math.abs(puck.vy) * 0.98;
                puck.y = PUCK_RADIUS;
            }
        }

        // Bottom wall and P1's goal
        if (puck.y + PUCK_RADIUS >= GAME_HEIGHT) {
            const inGoal = puck.x > GAME_WIDTH / 2 - GOAL_WIDTH / 2 && puck.x < GAME_WIDTH / 2 + GOAL_WIDTH / 2;
            if (inGoal) {
                this.handleGoal('p2'); // p2 scored
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

        const dx = puck.x - striker.x;
        const dy = puck.y - striker.y;
        const distance = Math.hypot(dx, dy) || 0.001;
        const minDist = PUCK_RADIUS + STRIKER_RADIUS;

        if (distance < minDist) {
            // Push puck out of mallet entirely
            const overlap = minDist - distance;
            const nx = dx / distance;
            const ny = dy / distance;

            puck.x += nx * overlap * 1.02;
            puck.y += ny * overlap * 1.02;

            // Elastic impulse physics
            const vRelX = puck.vx - striker.vx;
            const vRelY = puck.vy - striker.vy;
            const dot = vRelX * nx + vRelY * ny;

            // If objects are closing in
            if (dot < 0) {
                const e = 1.08; // Energetic rebound
                const impulse = -(1 + e) * dot;
                puck.vx += nx * impulse + striker.vx * 0.45;
                puck.vy += ny * impulse + striker.vy * 0.45;

                // Ensure snappy minimum strike speed
                const speed = Math.hypot(puck.vx, puck.vy);
                if (speed < 4) {
                    puck.vx = (nx || 0) * 6;
                    puck.vy = (ny || (playerRole === 'p1' ? -1 : 1)) * 6;
                } else if (speed > MAX_PUCK_SPEED) {
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
        // Reset strikers and targets
        for (const role of ['p1', 'p2']) {
            const y = role === 'p1' ? GAME_HEIGHT - 50 : 50;
            this.state.strikers[role] = { x: centerX, y, vx: 0, vy: 0 };
            this.targets[role] = { x: centerX, y };
        }
    }

    // Client sends its desired position (already in server coordinates).
    // We only store it as a movement target – no direct teleportation.
    handlePlayerMove(socketId, position) {
        const player = this.players[socketId];
        if (!player || this.state.status !== 'playing') return;

        let { x, y } = position;

        // Clamp to allowed half-field
        x = Math.max(STRIKER_RADIUS, Math.min(GAME_WIDTH - STRIKER_RADIUS, x));
        if (player.role === 'p1') {
            y = Math.max(GAME_HEIGHT / 2 + STRIKER_RADIUS, Math.min(GAME_HEIGHT - STRIKER_RADIUS, y));
        } else {
            y = Math.max(STRIKER_RADIUS, Math.min(GAME_HEIGHT / 2 - STRIKER_RADIUS, y));
        }

        this.targets[player.role] = { x, y };
    }

    handleRematch() {
        this.resetGameState();
        this.startCountdown();
    }
}