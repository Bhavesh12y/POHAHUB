import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { roomManager } from './rooms/roomManager.js';
import { endScribbleTurn, revealHint } from './games/scribble.js';

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

// THIS FUNCTION SECURELY FIXES THE VIEWER-ID BUG!
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

  socket.on('voice:join', ({ roomCode }) => {
    // Notify everyone else in the room that a user wants to connect voice
    socket.to(roomCode).emit('voice:user_joined', { socketId: socket.id });
  });

  socket.on('voice:signal', (payload) => {
    // Relay the WebRTC signaling data directly to the target user
    io.to(payload.targetId).emit('voice:signal', {
      senderId: socket.id,
      signalData: payload.signalData
    });
  });

  socket.on('room:create', ({ gameType, playerName }, callback) => {
    playerId = socket.id;
    const room = roomManager.createRoom({ gameType, hostId: playerId, hostName: playerName });
    roomManager.bindSocket(room.code, playerId, socket.id);
    socket.join(room.code);
    currentRoom = room.code;

    callback?.({ ok: true, room: roomManager.serializeRoom(room, playerId) });
    emitRoomUpdate(room);
  });

  socket.on('room:join', ({ roomCode, playerName }, callback) => {
    playerId = socket.id;
    const result = roomManager.joinRoom({ roomCode, playerId, playerName });

    if (!result.ok) return callback?.({ ok: false, error: result.error });

    const { room } = result;
    roomManager.bindSocket(room.code, playerId, socket.id);
    socket.join(room.code);
    currentRoom = room.code;

    callback?.({ ok: true, room: roomManager.serializeRoom(room, playerId) });
    emitRoomUpdate(room);
  });

  socket.on('room:start', (_payload, callback) => {
    if (!currentRoom || !playerId) return callback?.({ ok: false, error: 'Not in a room' });
    const result = roomManager.startGame(currentRoom, playerId);
    if (!result.ok) return callback?.({ ok: false, error: result.error });
    callback?.({ ok: true });
    emitRoomUpdate(result.room);
  });

  socket.on('game:move', (payload, callback) => {
    if (!currentRoom || !playerId) return callback?.({ ok: false, error: 'Not in a room' });
    const result = roomManager.handleGameMove(currentRoom, playerId, payload);
    if (!result.ok) return callback?.({ ok: false, error: result.error });
    callback?.({ ok: true });
    emitRoomUpdate(result.room);
  });

  // --- PROXIMITY RADAR LISTENERS ---

  socket.on('room:broadcast_location', (payload, callback) => {
    const { roomCode, lat, lng, url } = payload;
    
    if (!roomCode || !lat || !lng || !url) {
      if (callback) callback({ ok: false, error: 'Missing location data' });
      return;
    }
    
    // Attach the GPS coords to the room in memory
    const success = roomManager.setRoomBroadcastLocation(roomCode, lat, lng, url);
    if (callback) {
      callback({ ok: success });
    }
  });

  socket.on('room:find_nearby', (payload, callback) => {
    const { lat, lng } = payload;
    
    if (!lat || !lng) {
      if (callback) callback({ ok: false, error: 'Missing coordinates' });
      return;
    }

    // Pass the receiver's coords to see if any room is within 25 meters
    const nearbyRoom = roomManager.findNearbyRoom(lat, lng, 25); 
    
    if (nearbyRoom && nearbyRoom.broadcastLocation) {
      if (callback) callback({ ok: true, roomUrl: nearbyRoom.broadcastLocation.url });
    } else {
      if (callback) callback({ ok: false, error: 'No nearby rooms found' });
    }
  });

  // --- SCRIBBLE SPECIFIC SOCKET EVENTS ---
  socket.on('game:selectWord', ({ word }, callback) => {
    if (!currentRoom || !playerId) return;
    const room = roomManager.getRoom(currentRoom);
    if (room && room.gameType === 'scribble' && room.gameState.drawerId === playerId) {
        room.gameState.turnState = 'drawing';
        room.gameState.currentWord = word;
        room.gameState.startTime = Date.now();
        emitRoomUpdate(room); 
        callback?.({ ok: true });
    }
  });

  socket.on('draw:line', (payload) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('draw:line', payload);
  });

  // Listen for the fill bucket tool being used
  socket.on('draw:fill', (data) => {
    if (currentRoom) {
      // Broadcast the fill action to everyone else in the room
      socket.to(currentRoom).emit('draw:fill', data);
    }
  }); // <--- ADDED MISSING BRACKETS HERE!

  socket.on('draw:clear', () => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('draw:clear');
  });
  // ----------------------------------------

  socket.on('game:reset', (_payload, callback) => {
    if (!currentRoom || !playerId) return callback?.({ ok: false, error: 'Not in a room' });
    const result = roomManager.resetGame(currentRoom);
    if (!result.ok) return callback?.({ ok: false, error: result.error });
    callback?.({ ok: true });
    emitRoomUpdate(result.room);
  });

  socket.on('chat:message', ({ message }, callback) => {
    if (!currentRoom || !playerId) return callback?.({ ok: false, error: 'Not in a room' });
    
    const room = roomManager.getRoom(currentRoom);
    const player = room?.players.find((p) => p.id === playerId);
    if (!room || !player) return callback?.({ ok: false, error: 'Player not found' });

    const result = roomManager.addChatMessage(currentRoom, { 
      playerId, 
      playerName: player.name, 
      message 
    });

    // 1. Immediately send the chat message to everyone so it shows up in the box!
    io.to(currentRoom).emit('chat:message', result.entry);

    // 2. Update everyone's screen if scores changed or the turn ended early
    if (result.turnEndedEarly) {
      io.to(currentRoom).emit('chat:message', { 
        id: Date.now().toString(), 
        playerName: 'System', 
        message: `✨ Everyone guessed it! The word was: ${room.gameState.currentWord}` 
      });
      endScribbleTurn(room.gameState);
      io.to(currentRoom).emit('draw:clear');
      emitRoomUpdate(room); // Sends the new turn & new scores!
    } else if (result.roomUpdated) {
      emitRoomUpdate(room); // Syncs the new points for the person who guessed correctly!
    }

    callback?.({ ok: true });
  });

  socket.on('disconnect', () => {
    if (!currentRoom || !playerId) return;
    const result = roomManager.leaveRoom(currentRoom, playerId);
    if (!result) return;
    if (result.deleted) io.to(currentRoom).emit('room:closed', { reason: 'All players left' });
    else emitRoomUpdate(result.room);
  });
  
});

// --- GLOBAL GAME LOOP TIMER ---
setInterval(() => {
  roomManager.rooms.forEach((room) => {
    if (room.gameType === 'scribble' && room.status === 'playing' && room.gameState?.turnState === 'drawing') {
      const state = room.gameState;
      const elapsed = (Date.now() - state.startTime) / 1000;
      let needsSync = false;

      // Hint 1 at 50% time
      if (elapsed >= state.timeLimit * 0.5 && state.hintsRevealed === 0) {
        revealHint(state); needsSync = true;
      }
      // Hint 2 at 75% time
      if (elapsed >= state.timeLimit * 0.75 && state.hintsRevealed === 1) {
        revealHint(state); needsSync = true;
      }

      // Time's Up Timeout
      if (elapsed >= state.timeLimit) {
        io.to(room.code).emit('chat:message', {
          id: Date.now().toString(), playerName: 'System', message: `🕒 Time's up! The word was: ${state.currentWord}`
        });
        endScribbleTurn(state);
        io.to(room.code).emit('draw:clear');
        needsSync = true;
      }

      if (needsSync) emitRoomUpdate(room); 
    }
  });
}, 1000);

httpServer.listen(PORT, () => {
  console.log(`POHAHUB server running on http://localhost:${PORT}`);
});