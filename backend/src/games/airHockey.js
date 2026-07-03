const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const PUCK_RADIUS = 15;
const STRIKER_RADIUS = 25;
const GOAL_WIDTH = 120;
const MAX_SCORE = 7;

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
        
        if (Object.keys(this.players).length === 2) {
            this.startCountdown();
        }
        return true;
    }

    removePlayer(socketId) {
        delete this.players[socketId];
        this.state.status = 'waiting';
        this.io.to(this.roomId).emit('playerDisconnected');
        
        // FIX: 10-second grace period before destroying instance
        this.destroyTimeout = setTimeout(() => {
            this.destroy();
        }, 10000);
    }

    destroy() {
        if (this.gameInterval) clearInterval(this.gameInterval);
        if (this.networkInterval) clearInterval(this.networkInterval);
        if (this.countdownInterval) clearInterval(this.countdownInterval);
    }

    startCountdown() {
        this.state.status = 'countdown';
        if (this.countdownInterval) clearInterval(this.countdownInterval);
        this.resetPuck();
        this.io.to(this.roomId).emit('gameState', this.state);
        
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
        
        // FIX: 60 FPS physics loop (No Network Payload)
        this.gameInterval = setInterval(() => {
            if (this.state.status !== 'playing') return;
            this.updatePhysics();
        }, 1000 / 60);

        // FIX: 30 FPS Network update loop
        this.networkInterval = setInterval(() => {
            if (this.state.status !== 'playing') return;
            this.io.to(this.roomId).emit('gameState', this.state);
        }, 1000 / 30);
    }

    updatePhysics() {
        const puck = this.state.puck;
        puck.vx *= 0.99; 
        puck.vy *= 0.99;
        puck.x += puck.vx;
        puck.y += puck.vy;

        if (puck.x - PUCK_RADIUS <= 0) {
            puck.vx = Math.abs(puck.vx);
            puck.x = PUCK_RADIUS;
        } else if (puck.x + PUCK_RADIUS >= GAME_WIDTH) {
            puck.vx = -Math.abs(puck.vx);
            puck.x = GAME_WIDTH - PUCK_RADIUS;
        }

        if (puck.y - PUCK_RADIUS <= 0) {
            if (puck.x > GAME_WIDTH / 2 - GOAL_WIDTH / 2 && puck.x < GAME_WIDTH / 2 + GOAL_WIDTH / 2) {
                this.handleGoal('p1');
            } else {
                puck.vy = Math.abs(puck.vy);
                puck.y = PUCK_RADIUS;
            }
        } else if (puck.y + PUCK_RADIUS >= GAME_HEIGHT) {
            if (puck.x > GAME_WIDTH / 2 - GOAL_WIDTH / 2 && puck.x < GAME_WIDTH / 2 + GOAL_WIDTH / 2) {
                this.handleGoal('p2');
            } else {
                puck.vy = -Math.abs(puck.vy);
                puck.y = GAME_HEIGHT - PUCK_RADIUS;
            }
        }

        this.checkStrikerCollision('p1');
        this.checkStrikerCollision('p2');
    }

    checkStrikerCollision(playerRole) {
        const striker = this.state.strikers[playerRole];
        const puck = this.state.puck;
        
        const dx = puck.x - striker.x;
        const dy = puck.y - striker.y;
        const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 0.01);
        const minDist = PUCK_RADIUS + STRIKER_RADIUS;

        if (distance < minDist) {
            const overlap = minDist - distance;
            puck.x += (dx / distance) * overlap;
            puck.y += (dy / distance) * overlap;

            const angle = Math.atan2(dy, dx);
            const speed = Math.max(Math.sqrt(puck.vx * puck.vx + puck.vy * puck.vy), 5);
            
            puck.vx = Math.cos(angle) * (speed + 4); 
            puck.vy = Math.sin(angle) * (speed + 4);
            
            const currentSpeed = Math.sqrt(puck.vx * puck.vx + puck.vy * puck.vy);
            if (currentSpeed > 16) {
                puck.vx = (puck.vx / currentSpeed) * 16;
                puck.vy = (puck.vy / currentSpeed) * 16;
            }
        }
    }

    handleGoal(scorer) {
        this.state.score[scorer]++;
        if (this.state.score[scorer] >= MAX_SCORE) {
            this.state.status = 'finished';
            this.state.winner = scorer;
            if (this.gameInterval) clearInterval(this.gameInterval);
            if (this.networkInterval) clearInterval(this.networkInterval);
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
        x = Math.max(STRIKER_RADIUS, Math.min(GAME_WIDTH - STRIKER_RADIUS, x));
        
        if (player.role === 'p1') {
            y = Math.max(GAME_HEIGHT / 2 + STRIKER_RADIUS, Math.min(GAME_HEIGHT - STRIKER_RADIUS, y));
        } else {
            y = Math.max(STRIKER_RADIUS, Math.min(GAME_HEIGHT / 2 - STRIKER_RADIUS, y));
        }
        this.state.strikers[player.role] = { x, y };
    }

    handleRematch() {
        this.resetGameState();
        this.startCountdown();
    }
}