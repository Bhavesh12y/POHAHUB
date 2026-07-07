import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';

export default function TableTennisLanding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState(searchParams.get('join')?.toUpperCase() || '');
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
    
    // IMPORTANT: Changed gameType to 'table-tennis'
    const result = await emitWithAck('room:create', {
      gameType: 'table-tennis',
      playerName: username.trim(),
    });
    
    setLoading(false);
    if (!result.ok) {
      setError(result.error || 'Failed to create room');
      return;
    }
    localStorage.setItem('pohahub_username', username.trim());
    // IMPORTANT: Changed route to table-tennis
    navigate(`/games/table-tennis/room/${result.room.code}`, { state: { room: result.room } });
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
    // IMPORTANT: Changed route to table-tennis
    navigate(`/games/table-tennis/room/${result.room.code}`, { state: { room: result.room } });
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-12 font-sans">
      
      {/* HEADER */}
      <div className="text-center mb-12 rotate-1">
        
        {/* Neo-Brutalist Image Container */}
        <div className="relative inline-flex items-center justify-center w-24 h-24 mb-8 group -rotate-3">
          {/* Offset shadow block - using a cool cyan for Table Tennis */}
          <div className="absolute inset-0 bg-[#22d3ee] border-[3px] border-black rounded translate-x-2 translate-y-2" />
          {/* Stylized Emoji/SVG replacement for the image */}
          <div className="relative z-10 w-full h-full border-[3px] border-black rounded bg-white flex items-center justify-center transition-transform duration-300 group-hover:-translate-y-1 group-hover:-translate-x-1">
            <span className="text-5xl drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">🏓</span>
          </div>
        </div>

        <h2 
            className="text-[clamp(2.5rem,6vw,4rem)] font-black mb-3 tracking-tighter text-[#4ade80] uppercase leading-none"
            style={{ WebkitTextStroke: '0px black' }}
        >
          <div className="inline-block rotate-[-1deg]">
            <div className="bg-[#22d3ee] border-[3px] border-black px-6 py-3 shadow-[6px_6px_0px_#000]">
              <h2 className="text-[clamp(1.2rem,3vw,2rem)] font-black uppercase tracking-wide text-black">
                Table Tennis
              </h2>
            </div>
          </div>
        </h2>
        <p className="text-black font-bold tracking-widest uppercase bg-white border-[3px] border-black inline-block px-4 py-1 rounded shadow-[4px_4px_0px_#000] -rotate-1 mt-2">
          Create or join a room
        </p>
      </div>

      {/* MAIN CARD */}
      <div className="bg-white border-[4px] border-black p-8 space-y-6 rounded-xl shadow-[12px_12px_0px_#000] -rotate-1 relative">
        
        {/* Username Input */}
        <div>
          <label className="block text-sm font-black tracking-widest uppercase text-black mb-2">
            Username
          </label>
          <input
            type="text"
            className="w-full px-4 py-3 bg-white border-[3px] border-black rounded text-black font-bold focus:outline-none focus:ring-4 focus:ring-[#22d3ee] transition-all placeholder:text-gray-400 uppercase"
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

        {/* Create Room Button - Using Lime Green */}
        <button
          type="button"
          className="w-full py-3 bg-[#4ade80] text-black font-black tracking-widest uppercase border-[3px] border-black rounded shadow-[6px_6px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:translate-x-0 disabled:hover:shadow-[6px_6px_0px_#000] disabled:cursor-not-allowed"
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
            className="w-full px-4 py-4 bg-gray-100 border-[3px] border-black rounded focus:outline-none focus:ring-4 focus:ring-[#c084fc] transition-all uppercase tracking-[0.3em] text-center font-black text-2xl text-black"
            placeholder="ABC123"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
        </div>

        {/* Join Room Button - Using Purple */}
        <button
          type="button"
          className="w-full py-3 bg-[#c084fc] text-black font-black tracking-widest uppercase border-[3px] border-black rounded shadow-[6px_6px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:translate-x-0 disabled:hover:shadow-[6px_6px_0px_#000] disabled:cursor-not-allowed"
          onClick={handleJoin}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Join Room'}
        </button>
      </div>
    </div>
  );
}