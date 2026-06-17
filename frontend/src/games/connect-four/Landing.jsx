import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';

export default function ConnectFourLanding() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!username.trim()) {
      setError('Enter a username');
      return;
    }

    setLoading(true);
    setError('');
    connectSocket();

    const result = await emitWithAck('room:create', {
      gameType: 'connect-four',
      playerName: username.trim(),
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error || 'Failed to create room');
      return;
    }

    sessionStorage.setItem('pohahub_username', username.trim());
    navigate(`/games/connect-four/room/${result.room.code}`, { state: { room: result.room } });
  };

  const handleJoin = async () => {
    if (!username.trim()) {
      setError('Enter a username');
      return;
    }
    if (!roomCode.trim()) {
      setError('Enter a room code');
      return;
    }

    setLoading(true);
    setError('');
    connectSocket();

    const result = await emitWithAck('room:join', {
      roomCode: roomCode.trim().toUpperCase(),
      playerName: username.trim(),
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error || 'Failed to join room');
      return;
    }

    sessionStorage.setItem('pohahub_username', username.trim());
    navigate(`/games/connect-four/room/${result.room.code}`, { state: { room: result.room } });
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500/30 to-yellow-500/30 text-3xl mb-4">
          🔴
        </div>
        <h2 className="text-3xl font-bold mb-2">Connect 4</h2>
        <p className="text-hub-muted">Create a room or join with a friend&apos;s code.</p>
      </div>

      <div className="glass-card p-8 space-y-6">
        <div>
          <label className="block text-sm font-medium text-hub-muted mb-2">Username</label>
          <input
            type="text"
            className="input-field"
            placeholder="Your display name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
          />
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
            {error}
          </div>
        )}

        <button
          type="button"
          className="btn-primary w-full"
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Create Room'}
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-hub-border" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 bg-hub-card text-hub-muted">or join existing</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-hub-muted mb-2">Room Code</label>
          <input
            type="text"
            className="input-field uppercase tracking-widest text-center font-mono"
            placeholder="ABC123"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
        </div>

        <button
          type="button"
          className="btn-secondary w-full"
          onClick={handleJoin}
          disabled={loading}
        >
          Join Room
        </button>
      </div>
    </div>
  );
}
