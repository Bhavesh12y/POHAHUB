import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { roomManager } from './rooms/roomManager.js';

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

const app = express();
app.use(cors({ origin: CLIENT_ORIGINS }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'pohahub-backend' });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGINS,
    methods: ['GET', 'POST'],
  },
});

function emitRoomUpdate(room) {
  room.players.forEach((player) => {
    if (player.socketId) {
      io.to(player.socketId).emit('room:update', roomManager.serializeRoom(room, player.id));
    }
  });
}

io.on('connection', (socket) => {
  let currentRoom = null;
  let playerId = null;

  socket.on('room:create', ({ gameType, playerName }, callback) => {
    playerId = socket.id;
    const room = roomManager.createRoom({
      gameType,
      hostId: playerId,
      hostName: playerName,
    });

    roomManager.bindSocket(room.code, playerId, socket.id);
    socket.join(room.code);
    currentRoom = room.code;

    callback?.({ ok: true, room: roomManager.serializeRoom(room, playerId) });
    emitRoomUpdate(room);
  });

  socket.on('room:join', ({ roomCode, playerName }, callback) => {
    playerId = socket.id;
    const result = roomManager.joinRoom({
      roomCode,
      playerId,
      playerName,
    });

    if (!result.ok) {
      callback?.({ ok: false, error: result.error });
      return;
    }

    const { room } = result;
    roomManager.bindSocket(room.code, playerId, socket.id);
    socket.join(room.code);
    currentRoom = room.code;

    callback?.({ ok: true, room: roomManager.serializeRoom(room, playerId) });
    emitRoomUpdate(room);
  });

  socket.on('room:start', (_payload, callback) => {
    if (!currentRoom || !playerId) {
      callback?.({ ok: false, error: 'Not in a room' });
      return;
    }

    const result = roomManager.startGame(currentRoom, playerId);
    if (!result.ok) {
      callback?.({ ok: false, error: result.error });
      return;
    }

    callback?.({ ok: true });
    emitRoomUpdate(result.room);
  });

  socket.on('game:move', (payload, callback) => {
    if (!currentRoom || !playerId) {
      callback?.({ ok: false, error: 'Not in a room' });
      return;
    }

    const result = roomManager.handleGameMove(currentRoom, playerId, payload);
    if (!result.ok) {
      callback?.({ ok: false, error: result.error });
      return;
    }

    callback?.({ ok: true });
    emitRoomUpdate(result.room);
  });

  socket.on('game:reset', (_payload, callback) => {
    if (!currentRoom || !playerId) {
      callback?.({ ok: false, error: 'Not in a room' });
      return;
    }

    const room = roomManager.getRoom(currentRoom);
    if (!room) {
      callback?.({ ok: false, error: 'Room not found' });
      return;
    }

    // Only the host can restart the game
    if (room.hostId !== playerId) {
      callback?.({ ok: false, error: 'Only the host can restart the game' });
      return;
    }

    const result = roomManager.resetGame(currentRoom);
    if (!result.ok) {
      callback?.({ ok: false, error: result.error });
      return;
    }

    callback?.({ ok: true });
    emitRoomUpdate(result.room);
  });

  socket.on('chat:message', ({ message }, callback) => {
    if (!currentRoom || !playerId) {
      callback?.({ ok: false, error: 'Not in a room' });
      return;
    }

    const room = roomManager.getRoom(currentRoom);
    const player = room?.players.find((p) => p.id === playerId);
    if (!room || !player) {
      callback?.({ ok: false, error: 'Player not found' });
      return;
    }

    const entry = roomManager.addChatMessage(currentRoom, {
      playerId,
      playerName: player.name,
      message,
    });

    io.to(currentRoom).emit('chat:message', entry);
    callback?.({ ok: true });
  });

  socket.on('disconnect', () => {
    if (!currentRoom || !playerId) return;

    const result = roomManager.leaveRoom(currentRoom, playerId);
    if (!result) return;

    if (result.deleted) {
      io.to(currentRoom).emit('room:closed', { reason: 'All players left' });
    } else {
      emitRoomUpdate(result.room);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`POHAHUB server running on http://localhost:${PORT}`);
});
