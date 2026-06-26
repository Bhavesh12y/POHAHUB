import { createConnectFourState, dropDisc, serializeConnectFourState } from '../games/connectFour.js';
import { createTicTacToeState, playMove, serializeTicTacToeState } from '../games/tictactoe.js';
import { createScribbleState, serializeScribbleState } from '../games/scribble.js';
import { createSnakeAndLadderState, rollDice, serializeSnakeAndLadderState } from '../games/snakeAndLadder.js';
import { createTambolaState, drawNumber, claimPattern, serializeTambolaState } from '../games/tambola.js';

import { createStonePaperScissorState, playSpsMove, nextSpsRound, serializeSpsState } from '../games/stonePaperScissor.js';
const PLAYER_COLORS = ['red', 'yellow'];
const PLAYER_SYMBOLS = ['X', 'O'];

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do { code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join(''); } while (this.rooms.has(code));
    return code;
  }

  getRoom(roomCode) {
    return this.rooms.get(roomCode.toUpperCase()) ?? null;
  }

  // --- PROXIMITY RADAR METHODS ---

  setRoomBroadcastLocation(roomCode, lat, lng, url) {
    const room = this.getRoom(roomCode);
    if (room) {
      // Save location and a timestamp to ignore old, dead broadcasts later
      room.broadcastLocation = { lat, lng, url, timestamp: Date.now() };
      return true;
    }
    return false;
  }

  findNearbyRoom(lat, lng, maxDistanceMeters = 25) {
    let closestRoom = null;
    let minDistance = Infinity;

    for (const [code, room] of this.rooms.entries()) {
      // Only look at rooms that are actively broadcasting and still waiting for players
      if (room.broadcastLocation && room.status === 'waiting') {
        
        // Optional: Ignore broadcasts older than 15 minutes to prevent ghost rooms
        if (Date.now() - room.broadcastLocation.timestamp > 15 * 60 * 1000) {
          continue;
        }

        const dist = this._calculateDistance(lat, lng, room.broadcastLocation.lat, room.broadcastLocation.lng);
        
        // Find the absolute closest room within our radius
        if (dist <= maxDistanceMeters && dist < minDistance) {
          minDistance = dist;
          closestRoom = room;
        }
      }
    }
    return closestRoom;
  }

  // The Haversine Formula (Calculates distance in meters between two coordinates)
  _calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth's radius in meters
    const rad = Math.PI / 180;
    const phi1 = lat1 * rad;
    const phi2 = lat2 * rad;
    const deltaPhi = (lat2 - lat1) * rad;
    const deltaLambda = (lon2 - lon1) * rad;

    const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) *
              Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; 
  }
  // --------------------------------

createRoom({ gameType, hostId, hostName, maxPlayers = 2 }) {
    // Dynamically set limits based on the game type
    let limit = maxPlayers;
    if (gameType === 'scribble') limit = 8;
    if (gameType === 'tambola') limit = 50; // Tambola gets a massive lobby!
  if (gameType === 'stone-paper-scissor') limit = 2;
    const host = { id: hostId, name: hostName, socketId: null };
    const room = {
      code: this.generateRoomCode(),
      gameType, hostId, maxPlayers: limit,
      players: [host], spectators: [], chat: [],
      status: 'waiting', gameState: null, createdAt: Date.now(),
    };
    this.rooms.set(room.code, room);
    return room;
  }

  joinRoom({ roomCode, playerId, playerName }) {
    const room = this.getRoom(roomCode);
    if (!room) return { ok: false, error: 'Room not found' };

    const existingById = room.players.find((p) => p.id === playerId);
    if (existingById) return { ok: true, room };

  const existingByName = room.players.find((p) => p.name.toLowerCase() === playerName.toLowerCase());
    if (existingByName) {
      const oldId = existingByName.id;
      existingByName.id = playerId;
      
      if (room.gameState?.players) {
        const gamePlayer = room.gameState.players.find((p) => p.id === oldId);
        if (gamePlayer) gamePlayer.id = playerId;
        if (room.gameState.winner?.id === oldId) room.gameState.winner.id = playerId;
        if (room.gameState.lastMove?.playerId === oldId) room.gameState.lastMove.playerId = playerId;
        if (room.gameState.drawerId === oldId) room.gameState.drawerId = playerId;
        
        if (room.gameState.guessedPlayers) {
           const idx = room.gameState.guessedPlayers.indexOf(oldId);
           if (idx !== -1) room.gameState.guessedPlayers[idx] = playerId;
        }
      }
      if (room.hostId === oldId) room.hostId = playerId;
      return { ok: true, room };
    }

    if (room.status === 'playing' && room.gameType !== 'scribble') return { ok: false, error: 'Game in progress' };
    if (room.players.length >= room.maxPlayers) return { ok: false, error: 'Room full' };

    room.players.push({ id: playerId, name: playerName, socketId: null });
    if (room.gameType === 'scribble' && room.gameState) room.gameState.players.push({ id: playerId, name: playerName, score: 0 });
    const joinMessage = {
      id: `${Date.now()}-join-${playerId}`,
      playerId: 'SYSTEM',
      playerName: 'System',
      message: `👋 ${playerName} joined the room!`,
      timestamp: Date.now()
    };
    room.chat.push(joinMessage);
    if (room.chat.length > 100) room.chat.shift(); // Keeps chat from getting too long
    
    return { ok: true, room };
  }

  leaveRoom(roomCode, playerId) {
    const room = this.getRoom(roomCode);
    if (!room) return null;
    const player = room.players.find((p) => p.id === playerId);
    if (player) player.socketId = null;

    if (room.players.filter((p) => p.socketId).length === 0) {
      this.rooms.delete(room.code);
      return { deleted: true, room };
    }
    return { deleted: false, room };
  }

  getRoomByPlayerId(playerId) {
    // We check all active rooms to find which one this player is currently in
    for (const roomCode in this.rooms) {
      const room = this.rooms[roomCode];
      if (room.players && room.players.some(p => p.id === playerId)) {
        return room;
      }
    }
    return null;
  }

  bindSocket(roomCode, playerId, socketId) {
    const room = this.getRoom(roomCode);
    if (!room) return null;
    const player = room.players.find((p) => p.id === playerId);
    if (player) player.socketId = socketId;
    return room;
  }

addChatMessage(roomCode, { playerId, playerName, message }) {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    let finalMessage = message.trim().slice(0, 500);
    let isCorrectGuess = false;
    let turnEndedEarly = false;

    // --- DYNAMIC SCRIBBLE SCORING & SPOILER PREVENTION ---
    if (room.gameType === 'scribble' && room.status === 'playing' && room.gameState?.turnState === 'drawing') {
      const state = room.gameState;
      const isDrawer = playerId === state.drawerId;
      const hasGuessed = state.guessedPlayers.includes(playerId);
      
      // Check if the chat message matches the secret word
      const isMatch = finalMessage.toLowerCase() === state.currentWord.toLowerCase();

      if (isMatch) {
        if (isDrawer) {
          // Prevent the Drawer from giving away the answer
          finalMessage = "🤐 I tried to give away the word!";
        } else if (hasGuessed) {
          // Prevent winners from spoiling it for others
          finalMessage = "🤐 I tried to spoil the word!";
        } else {
          // A valid guess from someone who hasn't guessed yet!
          isCorrectGuess = true;
          state.guessedPlayers.push(playerId);
          
          // Calculate Dynamic Points based on time
          const elapsed = (Date.now() - state.startTime) / 1000;
          const remaining = Math.max(0, state.timeLimit - elapsed);
          const score = Math.floor(100 + (100 * (remaining / state.timeLimit))); 
          
          // 1. Give points to the Guesser
          const player = state.players.find((p) => p.id === playerId);
          if (player) player.score += score;
          
          // 2. TRADITIONAL RULES: Give scaled points to the Drawer
          // The drawer gets a fair, balanced fraction of the guesser's score!
          const drawer = state.players.find((p) => p.id === state.drawerId);
          if (drawer) {
            const totalGuessers = Math.max(1, state.players.length - 1);
            const drawerBonus = Math.floor(score / totalGuessers);
            drawer.score += drawerBonus; 
          }

          finalMessage = `🎉 Guessed the word! (+${score} pts)`;

          if (state.guessedPlayers.length >= state.players.length - 1) turnEndedEarly = true;
        }
      }
    }

    const entry = { 
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, 
      playerId, 
      playerName, 
      message: finalMessage, 
      timestamp: Date.now() 
    };
    
    room.chat.push(entry);
    if (room.chat.length > 100) room.chat.shift();

    return { entry, roomUpdated: isCorrectGuess, turnEndedEarly, room }; 
  }

  startGame(roomCode, playerId) {
    const room = this.getRoom(roomCode);
    if (!room || room.hostId !== playerId) return { ok: false, error: 'Only host can start' };
    if (room.players.length < 2) return { ok: false, error: 'Need 2+ players' };

    if (room.gameType === 'connect-four') {
      room.gameState = createConnectFourState(room.players.map((p, i) => ({ ...p, color: PLAYER_COLORS[i] })));
    } else if (room.gameType === 'tic-tac-toe') {
      room.gameState = createTicTacToeState(room.players.map((p, i) => ({ ...p, symbol: PLAYER_SYMBOLS[i] })));
    } else if (room.gameType === 'scribble') {
      room.gameState = createScribbleState(room.players.map((p) => ({ id: p.id, name: p.name })));
    }else if (room.gameType === 'snake-and-ladder') {
      room.gameState = createSnakeAndLadderState(room.players.map((p) => ({ id: p.id, name: p.name })));
    }else if (room.gameType === 'tambola') {
      room.gameState = createTambolaState(
        room.players.map((p) => ({ id: p.id, name: p.name })),
        room.hostId
      );
    }else if (room.gameType === 'stone-paper-scissor') {
      room.gameState = createStonePaperScissorState(room.players.map((p) => ({ id: p.id, name: p.name }))); // Add this line
    }

    room.status = 'playing';
    return { ok: true, room };
  }

  handleGameMove(roomCode, playerId, payload) {
    const room = this.getRoom(roomCode);
    if (!room || room.status !== 'playing') return { ok: false, error: 'No active game' };

    if (room.gameType === 'connect-four') return dropDisc(room.gameState, payload.column, playerId).ok ? { ok: true, room } : { ok: false };
    if (room.gameType === 'tic-tac-toe') return playMove(room.gameState, payload.index, playerId).ok ? { ok: true, room } : { ok: false };
    if (room.gameType === 'snake-and-ladder') {
      if (payload.action === 'roll') {
        return rollDice(room.gameState, playerId).ok ? { ok: true, room } : { ok: false };
      }
    }
    if (room.gameType === 'tambola') {
      if (payload.action === 'draw') {
        const result = drawNumber(room.gameState, playerId);
        return result.ok ? { ok: true, room } : { ok: false, error: result.error };
      }
      if (payload.action === 'claim') {
        const result = claimPattern(room.gameState, playerId, payload.pattern);
        return result.ok ? { ok: true, room } : { ok: false, error: result.error };
      }
    }
    if (room.gameType === 'stone-paper-scissor') {
      if (payload.action === 'play') {
        return playSpsMove(room.gameState, playerId, payload.choice).ok ? { ok: true, room } : { ok: false };
      }
      if (payload.action === 'nextRound') {
        return nextSpsRound(room.gameState).ok ? { ok: true, room } : { ok: false };
      }
    }
    return { ok: false, error: 'Unsupported game type' };
  }

  resetGame(roomCode) {
    // Resets are the exact same logic as starting
    return this.startGame(roomCode, this.getRoom(roomCode)?.hostId);
  }

  serializeRoom(room, viewerId) {
    const payload = {
      code: room.code, gameType: room.gameType, hostId: room.hostId, maxPlayers: room.maxPlayers,
      players: room.players.map(({ id, name }) => ({ id, name })), status: room.status, chat: room.chat, viewerId,
    };

    if (room.gameState && room.gameType === 'connect-four') payload.gameState = serializeConnectFourState(room.gameState);
    else if (room.gameState && room.gameType === 'tic-tac-toe') payload.gameState = serializeTicTacToeState(room.gameState);
    else if (room.gameState && room.gameType === 'scribble') payload.gameState = serializeScribbleState(room.gameState, viewerId);
    else if (room.gameState && room.gameType === 'snake-and-ladder') payload.gameState = serializeSnakeAndLadderState(room.gameState);
    else if (room.gameState && room.gameType === 'tambola') payload.gameState = serializeTambolaState(room.gameState);
    else if (room.gameState && room.gameType === 'stone-paper-scissor') payload.gameState = serializeSpsState(room.gameState);
    return payload;
  }
}

export const roomManager = new RoomManager();