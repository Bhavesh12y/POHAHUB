import {
  createConnectFourState,
  dropDisc,
  serializeConnectFourState,
} from '../games/connectFour.js';

const PLAYER_COLORS = ['red', 'yellow'];

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do {
      code = Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    } while (this.rooms.has(code));
    return code;
  }

  getRoom(roomCode) {
    return this.rooms.get(roomCode.toUpperCase()) ?? null;
  }

  createRoom({ gameType, hostId, hostName, maxPlayers = 2 }) {
    const roomCode = this.generateRoomCode();
    const host = { id: hostId, name: hostName, socketId: null };

    const room = {
      code: roomCode,
      gameType,
      hostId,
      maxPlayers,
      players: [host],
      spectators: [],
      chat: [],
      status: 'waiting',
      gameState: null,
      createdAt: Date.now(),
    };

    this.rooms.set(roomCode, room);
    return room;
  }

  joinRoom({ roomCode, playerId, playerName }) {
    const room = this.getRoom(roomCode);
    if (!room) {
      return { ok: false, error: 'Room not found' };
    }

    const existingById = room.players.find((p) => p.id === playerId);
    if (existingById) {
      return { ok: true, room };
    }

    const existingByName = room.players.find(
      (p) => p.name.toLowerCase() === playerName.toLowerCase() && !p.socketId,
    );
    if (existingByName) {
      const oldId = existingByName.id;
      existingByName.id = playerId;

      if (room.gameState?.players) {
        const gamePlayer = room.gameState.players.find((p) => p.id === oldId);
        if (gamePlayer) {
          gamePlayer.id = playerId;
        }
        if (room.gameState.winner?.id === oldId) {
          room.gameState.winner.id = playerId;
        }
        if (room.gameState.lastMove?.playerId === oldId) {
          room.gameState.lastMove.playerId = playerId;
        }
      }

      if (room.hostId === oldId) {
        room.hostId = playerId;
      }

      return { ok: true, room };
    }

    if (room.status === 'playing') {
      return { ok: false, error: 'Game already in progress' };
    }

    if (room.players.length >= room.maxPlayers) {
      return { ok: false, error: 'Room is full' };
    }

    room.players.push({ id: playerId, name: playerName, socketId: null });
    return { ok: true, room };
  }

  leaveRoom(roomCode, playerId) {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.socketId = null;
    }

    const connectedPlayers = room.players.filter((p) => p.socketId);
    if (connectedPlayers.length === 0 && room.players.every((p) => !p.socketId)) {
      this.rooms.delete(room.code);
      return { deleted: true, room };
    }

    return { deleted: false, room };
  }

  bindSocket(roomCode, playerId, socketId) {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    const player = room.players.find((p) => p.id === playerId);
    if (player) {
      player.socketId = socketId;
    }
    return room;
  }

  addChatMessage(roomCode, { playerId, playerName, message }) {
    const room = this.getRoom(roomCode);
    if (!room) return null;

    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      playerId,
      playerName,
      message: message.trim().slice(0, 500),
      timestamp: Date.now(),
    };

    room.chat.push(entry);
    if (room.chat.length > 100) {
      room.chat.shift();
    }

    return entry;
  }

  startGame(roomCode, playerId) {
    const room = this.getRoom(roomCode);
    if (!room) {
      return { ok: false, error: 'Room not found' };
    }

    if (room.hostId !== playerId) {
      return { ok: false, error: 'Only the host can start the game' };
    }

    if (room.players.length < 2) {
      return { ok: false, error: 'Need at least 2 players' };
    }

    if (room.gameType === 'connect-four') {
      const players = room.players.map((p, i) => ({
        id: p.id,
        name: p.name,
        color: PLAYER_COLORS[i],
      }));
      room.gameState = createConnectFourState(players);
    }

    room.status = 'playing';
    return { ok: true, room };
  }

  handleGameMove(roomCode, playerId, payload) {
    const room = this.getRoom(roomCode);
    if (!room || room.status !== 'playing') {
      return { ok: false, error: 'No active game' };
    }

    if (room.gameType === 'connect-four') {
      const result = dropDisc(room.gameState, payload.column, playerId);
      if (!result.ok) {
        return result;
      }
      return { ok: true, room };
    }

    return { ok: false, error: 'Unsupported game type' };
  }

  serializeRoom(room, viewerId) {
    const payload = {
      code: room.code,
      gameType: room.gameType,
      hostId: room.hostId,
      maxPlayers: room.maxPlayers,
      players: room.players.map(({ id, name }) => ({ id, name })),
      status: room.status,
      chat: room.chat,
      viewerId,
    };

    if (room.gameState && room.gameType === 'connect-four') {
      payload.gameState = serializeConnectFourState(room.gameState);
    }

    return payload;
  }
}

export const roomManager = new RoomManager();
