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
    <div className="max-w-xl mx-auto px-6 py-12 font-sans">
      
      {/* HEADER */}
      <div className="text-center mb-12 rotate-1">
        <h2 
            className="text-[clamp(2rem,6vw,4rem)] font-black mb-3 tracking-tighter text-[#facc15] uppercase"
            style={{ WebkitTextStroke: '2px black', textShadow: '4px 4px 0px #000' }}
        >
          Tambola
        </h2>
        <p className="text-black font-bold tracking-widest uppercase bg-white border-[3px] border-black inline-block px-4 py-1 rounded shadow-[4px_4px_0px_#000] -rotate-1">
          Host or join a game
        </p>
      </div>

      {/* MAIN CARD */}
      <div className="bg-white border-[4px] border-black p-8 space-y-6 rounded-xl shadow-[clamp(6px,1.5vw,12px)_clamp(6px,1.5vw,12px)_0px_#000] -rotate-1 relative">
        
        {/* Username Input */}
        <div>
          <label className="block text-sm font-black tracking-widest uppercase text-black mb-2">
            Username
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 bg-white border-[3px] border-black rounded text-black font-bold focus:outline-none focus:ring-4 focus:ring-[#facc15] transition-all"
            placeholder="YOUR DISPLAY NAME"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            maxLength={20}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="px-4 py-3 rounded bg-[#ef4444] border-[3px] border-black text-black font-black uppercase tracking-wide text-sm shadow-[4px_4px_0px_#000] animate-bounce">
            {error}
          </div>
        )}

        {/* Create Room Button */}
        <button
          type="button"
          className="w-full py-3 bg-[#facc15] text-black font-black tracking-widest uppercase border-[3px] border-black rounded shadow-[6px_6px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:translate-x-0 disabled:hover:shadow-[6px_6px_0px_#000] disabled:cursor-not-allowed"
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Create Room'}
        </button>

        {/* Divider */}
        <div className="relative py-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t-[3px] border-black" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-4 bg-white font-black tracking-widest uppercase text-black border-[3px] border-black rounded-full shadow-[2px_2px_0px_#000]">
              OR JOIN EXISTING
            </span>
          </div>
        </div>

        {/* Room Code Input */}
        <div>
          <label className="block text-sm font-black tracking-widest uppercase text-black mb-2">
            Room Code
          </label>
          <input
            type="text"
            className="w-full px-4 py-4 bg-gray-100 border-[3px] border-black rounded focus:outline-none focus:ring-4 focus:ring-[#3b82f6] transition-all uppercase tracking-[0.3em] text-center font-black text-2xl text-black"
            placeholder="ABC123"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
        </div>

        {/* Join Room Button */}
        <button
          type="button"
          className="w-full py-3 bg-[#3b82f6] text-white font-black tracking-widest uppercase border-[3px] border-black rounded shadow-[6px_6px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:translate-x-0 disabled:hover:shadow-[6px_6px_0px_#000] disabled:cursor-not-allowed"
          onClick={handleJoin}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Join Room'}
        </button>
      </div>
    </div>
  );
}