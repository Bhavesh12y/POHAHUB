import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
const ACK_TIMEOUT_MS = 5000;

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(SERVER_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function connectSocket() {
  const s = getSocket();
  if (!s.connected) {
    s.connect();
  }
  return s;
}

export function disconnectSocket() {
  if (socket?.connected) {
    socket.disconnect();
  }
}

export function emitWithAck(event, payload, timeoutMs = ACK_TIMEOUT_MS) {
  return new Promise((resolve) => {
    const s = connectSocket();
    s.timeout(timeoutMs).emit(event, payload, (err, response) => {
      if (err) {
        resolve({
          ok: false,
          error: 'Connection timed out. Please check your network and try again.',
        });
        return;
      }

      resolve(response ?? { ok: false, error: 'No response from server.' });
    });
  });
}
