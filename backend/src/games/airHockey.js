const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const PUCK_RADIUS = 20;    // Increased from 15
const STRIKER_RADIUS = 35; // Increased from 25
const GOAL_WIDTH = 140;    // Increased from 120 to fit the bigger puck
const MAX_SCORE = 5;

// COORDINATE SPACE CONTRACT:
// This simulation is intentionally FIXED and is never rotated — P1's
// striker always lives in the bottom half of the board (y: 300-600) and
// P2's striker always lives in the top half (y: 0-300). For the "relative
// perspective" feature, the CLIENT (AirHockeyBoard.jsx) is responsible for
// rotating its own <canvas> rendering 180° — and inverting its own pointer
// input — only when it is P2, so both players visually play "up the board"
// from the bottom of their own screen. The server doesn't need to know or
// care about any of that; it just keeps simulating this same fixed space.
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

        // NEW: tell this specific socket which side it was assigned. The
        // client needs this to decide whether to flip its canvas 180°,
        // whether to invert drag input, and which entry in
        // `state.strikers` is "theirs" for client-side prediction. Every
        // socket auto-joins a room named after its own id in Socket.IO,
        // so `io.to(socketId)` reaches only the player who just joined.
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

    // NEW: single place that broadcasts the authoritative game state.
    // Used by both the countdown reset and the 30Hz network loop below,
    // so there's one source of truth for what a "gameState" payload is.
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
        
        // FIX: 60 FPS physics loop (No Network Payload)
        this.gameInterval = setInterval(() => {
            if (this.state.status !== 'playing') return;
            this.updatePhysics();
        }, 1000 / 60);

        // FIX: 30 FPS Network update loop
        // (The client fills the gaps between these 30Hz snapshots with
        // interpolation — see the render loop in AirHockeyBoard.jsx —
        // so we get smooth 60fps visuals without flooding the socket
        // with a full 60Hz payload.)
        this.networkInterval = setInterval(() => {
            if (this.state.status !== 'playing') return;
            this.broadcastState();
        }, 1000 / 30);
    }

    updatePhysics() {
        const puck = this.state.puck;
        puck.vx *= 0.985; 
        puck.vy *= 0.985;
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
        const striker = this.state.strikers[playerRole]; //[cite: 11]
        const puck = this.state.puck; //[cite: 11]
        
        const dx = puck.x - striker.x; //[cite: 11]
        const dy = puck.y - striker.y; //[cite: 11]
        const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 0.01); //[cite: 11]
        const minDist = PUCK_RADIUS + STRIKER_RADIUS; //[cite: 11]

        if (distance < minDist) {
            const overlap = minDist - distance; //[cite: 11]
            puck.x += (dx / distance) * overlap; //[cite: 11]
            puck.y += (dy / distance) * overlap; //[cite: 11]

            // --- NEW: APPLY STRIKER MOMENTUM ---
            const angle = Math.atan2(dy, dx);
            
            // Calculate how fast the player was swiping
            const strikerSpeed = Math.hypot(striker.vx || 0, striker.vy || 0);
            const basePuckSpeed = Math.max(Math.sqrt(puck.vx * puck.vx + puck.vy * puck.vy), 5);
            
            // Add 80% of the striker's physical speed to the puck for a snappy hit
            const newSpeed = basePuckSpeed + (strikerSpeed * 0.8) + 4;
            
            puck.vx = Math.cos(angle) * newSpeed;
            puck.vy = Math.sin(angle) * newSpeed;
            // -----------------------------------
            
            const currentSpeed = Math.sqrt(puck.vx * puck.vx + puck.vy * puck.vy);
            
            // Increased the speed limit slightly from 16 to 22 so hard hits feel better
            if (currentSpeed > 22) {
                puck.vx = (puck.vx / currentSpeed) * 22;
                puck.vy = (puck.vy / currentSpeed) * 22;
            }
        }if (distance < minDist) {
            const overlap = minDist - distance;
            puck.x += (dx / distance) * overlap;
            puck.y += (dy / distance) * overlap;

            // --- FIX: REALISTIC MOMENTUM TRANSFER ---
            const angle = Math.atan2(dy, dx);
            
            // 1. Calculate striker speed, but CLAMP it to a max of 15 
            // to prevent network teleports from launching the puck.
            const rawStrikerSpeed = Math.hypot(striker.vx || 0, striker.vy || 0);
            const clampedStrikerSpeed = Math.min(rawStrikerSpeed, 15);
            
            const basePuckSpeed = Math.max(Math.sqrt(puck.vx * puck.vx + puck.vy * puck.vy), 3);
            
            // 2. Softer transfer (0.5 instead of 0.8) and lower flat boost (+3 instead of +4)
            const newSpeed = basePuckSpeed + (clampedStrikerSpeed * 0.5) + 3;
            
            puck.vx = Math.cos(angle) * newSpeed;
            puck.vy = Math.sin(angle) * newSpeed;
            // ----------------------------------------
            
            const currentSpeed = Math.sqrt(puck.vx * puck.vx + puck.vy * puck.vy);
            
            // 3. Lower the absolute max speed limit from 22 down to 18
            if (currentSpeed > 18) {
                puck.vx = (puck.vx / currentSpeed) * 18;
                puck.vy = (puck.vy / currentSpeed) * 18;
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
            // The client uses this event to freeze the puck at its last
            // position and play a local "falling into the hole" shrink
            // animation before the reset snapshot below arrives.
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
        x = Math.max(STRIKER_RADIUS, Math.min(GAME_WIDTH - STRIKER_RADIUS, x)); //[cite: 11]
        
        if (player.role === 'p1') {
            y = Math.max(GAME_HEIGHT / 2 + STRIKER_RADIUS, Math.min(GAME_HEIGHT - STRIKER_RADIUS, y)); //[cite: 11]
        } else {
            y = Math.max(STRIKER_RADIUS, Math.min(GAME_HEIGHT / 2 - STRIKER_RADIUS, y)); //[cite: 11]
        }

        // --- NEW: TRACK STRIKER VELOCITY ---
        const oldX = this.state.strikers[player.role].x;
        const oldY = this.state.strikers[player.role].y;
        const vx = x - oldX;
        const vy = y - oldY;
        // -----------------------------------

        // Save the velocity (vx, vy) alongside the coordinates
        this.state.strikers[player.role] = { x, y, vx, vy };
    }

    handleRematch() {
        this.resetGameState();
        this.startCountdown();
    }
}