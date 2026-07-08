const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const PUCK_RADIUS = 20;
const STRIKER_RADIUS = 35;
const GOAL_WIDTH = 140;
const MAX_SCORE = 5;

const FRICTION = 0.985;
const MAX_PUCK_SPEED = 18;
const MAX_STRIKER_HIT_SPEED = 13;
const PHYSICS_SUBSTEPS = 4;          // 👈 increased for zero tunneling

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
                p1: { x: centerX, y: GAME_HEIGHT - 50, vx: 0, vy: 0 },
                p2: { x: centerX, y: 50, vx: 0, vy: 0 }
            }
        };

        this.targets = {
            p1: { x: centerX, y: GAME_HEIGHT - 50 },
            p2: { x: centerX, y: 50 }
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

        // 60 Hz authoritative physics
        this.gameInterval = setInterval(() => {
            if (this.state.status !== 'playing') return;
            this.updateStrikers();
            this.updatePhysics();
        }, 1000 / 60);

        // 60 Hz broadcast – no interpolation needed on the client
        this.networkInterval = setInterval(() => {
            if (this.state.status !== 'playing') return;
            this.broadcastState();
        }, 1000 / 60);
    }

    // ------------------------------------------------------------
    //  Striker Movement – instant, with capped hit velocity
    // ------------------------------------------------------------
    updateStrikers() {
        for (const role of ['p1', 'p2']) {
            const striker = this.state.strikers[role];
            const target = this.targets[role];

            const oldX = striker.x;
            const oldY = striker.y;

            // Move directly to the (already clamped) target
            striker.x = target.x;
            striker.y = target.y;

            let dx = striker.x - oldX;
            let dy = striker.y - oldY;
            const dist = Math.hypot(dx, dy);
            if (dist > MAX_STRIKER_HIT_SPEED && dist > 0) {
                const scale = MAX_STRIKER_HIT_SPEED / dist;
                dx *= scale;
                dy *= scale;
            }
            striker.vx = dx;
            striker.vy = dy;

            // Immediately push striker out of the puck
            this.resolveStrikerPuckOverlap(role);
        }
    }

    resolveStrikerPuckOverlap(role) {
        const striker = this.state.strikers[role];
        const puck = this.state.puck;
        const dx = striker.x - puck.x;
        const dy = striker.y - puck.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        const minDist = PUCK_RADIUS + STRIKER_RADIUS;

        if (dist < minDist) {
            const overlap = minDist - dist;
            const nx = dx / dist;
            const ny = dy / dist;
            striker.x += nx * overlap;
            striker.y += ny * overlap;
        }
    }

    // ------------------------------------------------------------
    //  Physics with sub‑stepping (no more tunneling)
    // ------------------------------------------------------------
    updatePhysics() {
        const puck = this.state.puck;
        const subVx = puck.vx / PHYSICS_SUBSTEPS;
        const subVy = puck.vy / PHYSICS_SUBSTEPS;

        for (let step = 0; step < PHYSICS_SUBSTEPS; step++) {
            // Apply friction per sub‑step
            puck.vx *= FRICTION ** (1 / PHYSICS_SUBSTEPS);
            puck.vy *= FRICTION ** (1 / PHYSICS_SUBSTEPS);

            puck.x += subVx;
            puck.y += subVy;

            // Wall collisions
            if (puck.x - PUCK_RADIUS <= 0) {
                puck.vx = Math.abs(puck.vx);
                puck.x = PUCK_RADIUS;
            } else if (puck.x + PUCK_RADIUS >= GAME_WIDTH) {
                puck.vx = -Math.abs(puck.vx);
                puck.x = GAME_WIDTH - PUCK_RADIUS;
            }

            // Top wall / goal
            if (puck.y - PUCK_RADIUS <= 0) {
                const inGoal = puck.x > GAME_WIDTH / 2 - GOAL_WIDTH / 2 && puck.x < GAME_WIDTH / 2 + GOAL_WIDTH / 2;
                if (inGoal) {
                    this.handleGoal('p1');
                    return;
                } else {
                    puck.vy = Math.abs(puck.vy);
                    puck.y = PUCK_RADIUS;
                }
            }

            // Bottom wall / goal
            if (puck.y + PUCK_RADIUS >= GAME_HEIGHT) {
                const inGoal = puck.x > GAME_WIDTH / 2 - GOAL_WIDTH / 2 && puck.x < GAME_WIDTH / 2 + GOAL_WIDTH / 2;
                if (inGoal) {
                    this.handleGoal('p2');
                    return;
                } else {
                    puck.vy = -Math.abs(puck.vy);
                    puck.y = GAME_HEIGHT - PUCK_RADIUS;
                }
            }

            // Striker collisions (each sub‑step)
            this.checkStrikerCollision('p1');
            this.checkStrikerCollision('p2');
        }
    }

    checkStrikerCollision(playerRole) {
        const striker = this.state.strikers[playerRole];
        const puck = this.state.puck;

        const dx = puck.x - striker.x;
        const dy = puck.y - striker.y;
        const distance = Math.hypot(dx, dy) || 0.01;
        const minDist = PUCK_RADIUS + STRIKER_RADIUS;

        if (distance < minDist) {
            const overlap = minDist - distance;
            const nx = dx / distance;
            const ny = dy / distance;

            // Push puck out (striker is “heavier”)
            puck.x += nx * overlap * 0.99;
            puck.y += ny * overlap * 0.99;
            striker.x -= nx * overlap * 0.01;
            striker.y -= ny * overlap * 0.01;

            const vRelX = puck.vx - striker.vx;
            const vRelY = puck.vy - striker.vy;
            const dot = vRelX * nx + vRelY * ny;

            if (dot < 0) {
                const e = 0.9;
                puck.vx -= (1 + e) * dot * nx;
                puck.vy -= (1 + e) * dot * ny;

                const speed = Math.hypot(puck.vx, puck.vy);
                if (speed > MAX_PUCK_SPEED) {
                    const scale = MAX_PUCK_SPEED / speed;
                    puck.vx *= scale;
                    puck.vy *= scale;
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
            const y = role === 'p1' ? GAME_HEIGHT - 50 : 50;
            this.state.strikers[role] = { x: centerX, y, vx: 0, vy: 0 };
            this.targets[role] = { x: centerX, y };
        }
    }

    handlePlayerMove(socketId, position) {
        const player = this.players[socketId];
        if (!player || this.state.status !== 'playing') return;

        let { x, y } = position;
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