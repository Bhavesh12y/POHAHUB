import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';

export default function ConnectFourLanding() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Load username from localStorage on mount
  useEffect(() => {
    const savedUsername = localStorage.getItem('pohahub_username');
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

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

    localStorage.setItem('pohahub_username', username.trim());
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

    localStorage.setItem('pohahub_username', username.trim());
    navigate(`/games/connect-four/room/${result.room.code}`, { state: { room: result.room } });
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
  <div className="text-center mb-12">
    
    {/* Premium Image Placeholder Container */}
    <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#0a0a0c] border border-white/[0.08] shadow-[0_0_20px_rgba(255,255,255,0.03)] mb-6 overflow-hidden group">
      {/* Subtle hover shine */}
      <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none" />
      
      <img 
        src="https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/Logo%20(1).png" 
        alt="Connect 4 Preview" 
        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110"
      />
    </div>

    <h2 className="text-4xl font-extrabold mb-3 tracking-tighter text-gray-100">
      Connect 4
    </h2>
    <p className="text-gray-500 font-light tracking-wide">
      Create a room or join with a friend&apos;s code.
    </p>
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
