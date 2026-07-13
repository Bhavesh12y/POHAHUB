import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { roomManager } from './rooms/roomManager.js';
import { endScribbleTurn, revealHint } from './games/scribble.js';
import { readFileSync } from "fs";
import admin from "firebase-admin";
import AirHockeyGame from './games/airHockey.js';
import TableTennisGame from './games/tableTennisGame.js';

const serviceAccount = JSON.parse(
  readFileSync(new URL('../serviceAccountKey.json', import.meta.url))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const PORT = process.env.PORT || 3001;
const CLIENT_ORIGINS = (process.env.CLIENT_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim());

const app = express();
app.use(cors({ origin: CLIENT_ORIGINS }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'Doozles-backend' });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: CLIENT_ORIGINS,
    methods: ['GET', 'POST'],
  },
});

const globalLeaderboards = {
  '2048': [],
  'block-blaster': [],
  'dino': [],
  'flappy-bird': [],
  'helix-jump': [],
};

// Tracks active scribble games to avoid main-thread blocking loops
const activeScribbleRooms = new Set();

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
    socket.to(roomCode).emit('voice:user_joined', { socketId: socket.id });
  });

  socket.on('voice:signal', (payload) => {
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

  socket.on('room:join', ({ roomCode, playerName, deviceToken }, callback) => {
    playerId = socket.id;
    const result = roomManager.joinRoom({ roomCode, playerId, playerName, deviceToken });

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



socket.on('sendSticker', ({ roomId, sticker }) => {
    // Broadcast to everyone in the room, including the sender
    io.to(roomId).emit('receiveSticker', { 
        sticker, 
        senderId: socket.id 
    });
});

  // --- AIR HOCKEY REAL-TIME EVENTS ---
  socket.on('joinAirHockey', ({ roomId, playerInfo }) => {
    const room = roomManager.getRoom(roomId);
    if (room && room.gameType === 'air-hockey') {
      if (!room.gameInstance) {
        room.gameInstance = new AirHockeyGame(roomId, io);
      }
      room.gameInstance.addPlayer(socket.id, playerInfo.id);
    }
  });

  socket.on('airHockeyMove', ({ roomId, position }) => {
    const room = roomManager.getRoom(roomId);
    if (room && room.gameInstance) {
      room.gameInstance.handlePlayerMove(socket.id, position);
    }
  });

  socket.on('airHockeyRematch', (roomId) => {
    const room = roomManager.getRoom(roomId);
    if (room && room.gameInstance) {
      room.gameInstance.handleRematch();
    }
  });

  // --- TABLE TENNIS REAL-TIME EVENTS ---
// --- TABLE TENNIS REAL-TIME EVENTS ---
  socket.on('tt:join', ({ roomId, playerInfo }) => {
    const room = roomManager.getRoom(roomId);
    if (room && room.gameType === 'table-tennis') {
      if (!room.gameInstance) {
        room.gameInstance = new TableTennisGame(roomId, io);
      }
      room.gameInstance.addPlayer(socket.id, playerInfo.id);
    }
  });

  socket.on('tt:move', ({ roomId, pos }) => {
    const room = roomManager.getRoom(roomId);
    if (room && room.gameInstance) {
      room.gameInstance.handlePlayerMove(socket.id, pos);
    }
  });

  socket.on('tt:rematch', (roomId) => {
    const room = roomManager.getRoom(roomId);
    if (room && room.gameInstance) {
      room.gameInstance.handleRematch();
    }
  });

  // --- LEADERBOARD EVENTS ---
  socket.on('leaderboard:get', async (gameId, callback) => {
    try {
      const doc = await db.collection('leaderboards').doc(gameId).get();
      const leaderboard = doc.exists ? doc.data().scores : [];
      callback?.({ ok: true, leaderboard });
    } catch (error) {
      console.error("Firebase Read Error:", error);
      callback?.({ ok: false, error: 'Failed to fetch leaderboard' });
    }
  });

  socket.on('leaderboard:submit', async ({ gameId, name, score }, callback) => {
    try {
      const docRef = db.collection('leaderboards').doc(gameId);
      await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(docRef);
        let scores = doc.exists ? doc.data().scores : [];
        const existingPlayerIndex = scores.findIndex(entry => entry.name === name);

        if (existingPlayerIndex !== -1) {
          if (score > scores[existingPlayerIndex].score) {
            scores[existingPlayerIndex].score = score;
          }
        } else {
          scores.push({ name, score, id: socket.id + Date.now() });
        }
        
        scores.sort((a, b) => b.score - a.score);
        scores = scores.slice(0, 3);
        transaction.set(docRef, { scores });
        io.emit(`leaderboard:update:${gameId}`, scores);
      });
      callback?.({ ok: true });
    } catch (error) {
      console.error("Firebase Write Error:", error);
      callback?.({ ok: false, error: 'Failed to save score' });
    }
  });

  // --- PROXIMITY RADAR LISTENERS ---
  socket.on('room:broadcast_location', (payload, callback) => {
    const { roomCode, lat, lng, url } = payload;
    if (!roomCode || !lat || !lng || !url) {
      if (callback) callback({ ok: false, error: 'Missing location data' });
      return;
    }
    const success = roomManager.setRoomBroadcastLocation(roomCode, lat, lng, url);
    if (callback) callback({ ok: success });
  });

  socket.on('room:find_nearby', (payload, callback) => {
    const { lat, lng } = payload;
    if (!lat || !lng) {
      if (callback) callback({ ok: false, error: 'Missing coordinates' });
      return;
    }
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
        activeScribbleRooms.add(currentRoom); // Track for optimized timer
        emitRoomUpdate(room); 
        callback?.({ ok: true });
    }
  });

  socket.on('draw:line', (payload) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('draw:line', payload);
  });

  socket.on('draw:fill', (data) => {
    if (currentRoom) {
      socket.to(currentRoom).emit('draw:fill', data);
    }
  }); 

  socket.on('draw:clear', () => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('draw:clear');
  });

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

    io.to(currentRoom).emit('chat:message', result.entry);

    if (result.turnEndedEarly) {
      activeScribbleRooms.delete(currentRoom); // Stop tracking timer
      io.to(currentRoom).emit('chat:message', { 
        id: Date.now().toString(), 
        playerName: 'System', 
        message: `✨ Everyone guessed it! The word was: ${room.gameState.currentWord}` 
      });
      endScribbleTurn(room.gameState);
      io.to(currentRoom).emit('draw:clear');
      emitRoomUpdate(room); 
    } else if (result.roomUpdated) {
      emitRoomUpdate(room); 
    }

    callback?.({ ok: true });
  });

  // FIX: Merged disconnected logic cleanly
  socket.on('disconnect', () => {
    if (!currentRoom || !playerId) return;
    const room = roomManager.getRoom(currentRoom);

    if (room && room.gameType === 'air-hockey' && room.gameInstance) {
      room.gameInstance.removePlayer(socket.id);
    }

    const result = roomManager.leaveRoom(currentRoom, playerId);
    if (!result) return;
    
    if (result.deleted) {
      if (room && room.gameInstance) room.gameInstance.destroy(); 
      activeScribbleRooms.delete(currentRoom);
      io.to(currentRoom).emit('room:closed', { reason: 'All players left' });
    } else {
      emitRoomUpdate(result.room);
    }
  });
});

// FIX: Optimized Game Loop - only processes active scribble drawing turns
setInterval(() => {
  if (activeScribbleRooms.size === 0) return;

  for (const roomCode of activeScribbleRooms) {
    const room = roomManager.getRoom(roomCode);
    
    // Safety check in case room was deleted
    if (!room || room.gameType !== 'scribble' || room.status !== 'playing' || room.gameState?.turnState !== 'drawing') {
      activeScribbleRooms.delete(roomCode);
      continue;
    }

    const state = room.gameState;
    const elapsed = (Date.now() - state.startTime) / 1000;
    let needsSync = false;

    if (elapsed >= state.timeLimit * 0.5 && state.hintsRevealed === 0) {
      revealHint(state); needsSync = true;
    }
    if (elapsed >= state.timeLimit * 0.75 && state.hintsRevealed === 1) {
      revealHint(state); needsSync = true;
    }

    if (elapsed >= state.timeLimit) {
      activeScribbleRooms.delete(roomCode);
      io.to(room.code).emit('chat:message', {
        id: Date.now().toString(), playerName: 'System', message: `🕒 Time's up! The word was: ${state.currentWord}`
      });
      endScribbleTurn(state);
      io.to(room.code).emit('draw:clear');
      needsSync = true;
    }

    if (needsSync) emitRoomUpdate(room); 
  }
}, 1000);

httpServer.listen(PORT, () => {
  console.log(`Doozles server running on http://localhost:${PORT}`);
});