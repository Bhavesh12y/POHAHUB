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

// --- GLOBAL GAME LOOP TIMER ---
import { endScribbleTurn, revealHint } from './games/scribble.js';

setInterval(() => {
  roomManager.rooms.forEach((room) => {
    if (room.gameType === 'scribble' && room.status === 'playing' && room.gameState?.turnState === 'drawing') {
      const state = room.gameState;
      const elapsed = (Date.now() - state.startTime) / 1000;
      
      let needsSync = false;

      // Hint 1 at 50% time
      if (elapsed >= state.timeLimit * 0.5 && state.hintsRevealed === 0) {
        revealHint(state);
        needsSync = true;
      }
      // Hint 2 at 75% time
      if (elapsed >= state.timeLimit * 0.75 && state.hintsRevealed === 1) {
        revealHint(state);
        needsSync = true;
      }

      // Time's Up Timeout
      if (elapsed >= state.timeLimit) {
        io.to(room.code).emit('chat:message', {
          id: Date.now().toString(),
          playerName: 'System',
          message: `🕒 Time's up! The word was: ${state.currentWord}`
        });
        endScribbleTurn(state);
        io.to(room.code).emit('draw:clear');
        needsSync = true;
      }

      if (needsSync) {
        io.to(room.code).emit('room:update', roomManager.serializeRoom(room));
      }
    }
  });
}, 1000); // Check every second
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
// Handle Chat and Early Turn Ends
  socket.on('chat:message', ({ message }, callback) => {
    if (!currentRoom || !playerId) return callback?.({ ok: false, error: 'Not in a room' });
    const room = roomManager.getRoom(currentRoom);
    const player = room?.players.find((p) => p.id === playerId);
    if (!room || !player) return callback?.({ ok: false, error: 'Player not found' });

    const result = roomManager.addChatMessage(currentRoom, { playerId, playerName: player.name, message });
    io.to(currentRoom).emit('chat:message', result.entry);

    if (result.turnEndedEarly) {
      endScribbleTurn(room.gameState);
      io.to(currentRoom).emit('draw:clear');
      emitRoomUpdate(room);
    } else if (result.roomUpdated) {
      emitRoomUpdate(room);
    }

    callback?.({ ok: true });
  });

  // NEW: Drawer chooses a word
  socket.on('game:selectWord', ({ word }, callback) => {
    if (!currentRoom || !playerId) return;
    const room = roomManager.getRoom(currentRoom);
    if (room && room.gameType === 'scribble' && room.gameState.drawerId === playerId) {
        room.gameState.turnState = 'drawing';
        room.gameState.currentWord = word;
        room.gameState.startTime = Date.now();
        io.to(currentRoom).emit('room:update', roomManager.serializeRoom(room));
        callback?.({ ok: true });
    }
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

  // ----------------------------------------------------
  // SCRIBBLE SPECIFIC EVENTS (High frequency, low payload)
  // ----------------------------------------------------
  
  socket.on('draw:line', (payload) => {
    if (!currentRoom) return;
    
    // Broadcast the raw drawing data to everyone in the room EXCEPT the sender.
    // We don't save this to roomManager state to save memory/bandwidth.
    socket.to(currentRoom).emit('draw:line', payload);
  });

  socket.on('draw:clear', () => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('draw:clear');
  });
});

httpServer.listen(PORT, () => {
  console.log(`POHAHUB server running on http://localhost:${PORT}`);
});
