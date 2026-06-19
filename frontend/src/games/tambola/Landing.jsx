import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';

export default function TambolaLanding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState(searchParams.get('join')?.toUpperCase() || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const savedUsername = localStorage.getItem('pohahub_username');
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  const handleCreate = async () => {
    if (!username.trim()) return setError('Enter a username');
    
    setLoading(true);
    setError('');
    connectSocket();
    
    const result = await emitWithAck('room:create', {
      gameType: 'tambola',
      playerName: username.trim(),
    });
    
    setLoading(false);
    if (!result.ok) return setError(result.error || 'Failed to create room');
    
    localStorage.setItem('pohahub_username', username.trim());
    // Use the playerId from result if your backend provides it, otherwise fallback
    const pId = result.room.players.find(p => p.name === username.trim())?.id;
    if (pId) sessionStorage.setItem('playerId', pId);

    navigate(`/games/tambola/room/${result.room.code}`, { state: { room: result.room } });
  };

  const handleJoin = async () => {
    if (!username.trim()) return setError('Enter a username');
    if (!roomCode.trim()) return setError('Enter a room code');
    
    setLoading(true);
    setError('');
    connectSocket();
    
    const result = await emitWithAck('room:join', {
      roomCode: roomCode.trim().toUpperCase(),
      playerName: username.trim(),
    });
    
    setLoading(false);
    if (!result.ok) return setError(result.error || 'Failed to join room');
    
    localStorage.setItem('pohahub_username', username.trim());
    const pId = result.room.players.find(p => p.name === username.trim())?.id;
    if (pId) sessionStorage.setItem('playerId', pId);

    navigate(`/games/tambola/room/${result.room.code}`, { state: { room: result.room } });
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <h2 className="text-4xl font-extrabold mb-3 tracking-tighter text-gray-100">
          Tambola
        </h2>
        <p className="text-gray-500 font-light tracking-wide">
          Host a game or join with a friend&apos;s code.
        </p>
      </div>

      <div className="glass-card bg-[#0a0a0c]/80 border-white/[0.05] p-8 space-y-6 rounded-2xl shadow-2xl">
        <div>
          <label className="block text-xs font-bold tracking-[0.2em] uppercase text-gray-600 mb-3">
            Username
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="Your display name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
          />
        </div>

        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm backdrop-blur-sm">
            {error}
          </div>
        )}

        <button
          type="button"
          className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)] disabled:opacity-50"
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? 'Establishing Connection...' : 'Create Room'}
        </button>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-white/[0.05]" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-4 bg-[#0a0a0c] tracking-widest uppercase text-gray-600">
              or join existing
            </span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold tracking-[0.2em] uppercase text-gray-600 mb-3">
            Room Code
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 transition-colors uppercase tracking-widest text-center font-mono text-xl"
            placeholder="ABC123"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
        </div>

        <button
          type="button"
          className="w-full py-3 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all disabled:opacity-50"
          onClick={handleJoin}
          disabled={loading}
        >
          Join Room
        </button>
      </div>
    </div>
  );
}