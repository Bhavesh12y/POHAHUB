import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';

export default function ScribbleLanding() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!username.trim()) return setError('Enter a username');
    setLoading(true); setError(''); connectSocket();
    const result = await emitWithAck('room:create', { gameType: 'scribble', playerName: username.trim() });
    setLoading(false);
    if (!result.ok) return setError(result.error || 'Failed to create room');
    sessionStorage.setItem('pohahub_username', username.trim());
    navigate(`/games/scribble/room/${result.room.code}`, { state: { room: result.room } });
  };

  const handleJoin = async () => {
    if (!username.trim() || !roomCode.trim()) return setError('Enter username and code');
    setLoading(true); setError(''); connectSocket();
    const result = await emitWithAck('room:join', { roomCode: roomCode.trim().toUpperCase(), playerName: username.trim() });
    setLoading(false);
    if (!result.ok) return setError(result.error || 'Failed to join');
    sessionStorage.setItem('pohahub_username', username.trim());
    navigate(`/games/scribble/room/${result.room.code}`, { state: { room: result.room } });
  };

  return (
    <div className="max-w-xl mx-auto px-6 py-12">
      <div className="text-center mb-12">
        <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#0a0a0c] border border-white/[0.08] shadow-[0_0_20px_rgba(255,255,255,0.03)] mb-6 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.05] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-10 pointer-events-none" />
          <img src="https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/Logo%20(1).png" alt="Scribble Preview" className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-110" />
        </div>
        <h2 className="text-4xl font-extrabold mb-3 tracking-tighter text-gray-100">Scribble</h2>
        <p className="text-gray-500 font-light tracking-wide">Draw your word, guess the art.</p>
      </div>

      <div className="glass-card bg-[#0a0a0c]/80 border-white/[0.05] p-8 space-y-6 rounded-2xl shadow-2xl">
        <div>
          <label className="block text-xs font-bold tracking-[0.2em] uppercase text-gray-600 mb-3">Username</label>
          <input type="text" className="input-field" placeholder="Your display name" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={20} />
        </div>
        {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}
        <button type="button" className="btn-primary w-full" onClick={handleCreate} disabled={loading}>{loading ? 'Connecting...' : 'Create Room'}</button>
        <div className="relative py-2"><div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/[0.05]" /></div><div className="relative flex justify-center text-xs"><span className="px-4 bg-[#0a0a0c] tracking-widest uppercase text-gray-600">or join existing</span></div></div>
        <div>
          <label className="block text-xs font-bold tracking-[0.2em] uppercase text-gray-600 mb-3">Room Code</label>
          <input type="text" className="input-field uppercase tracking-widest text-center font-mono text-xl" placeholder="ABC123" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} maxLength={6} />
        </div>
        <button type="button" className="btn-secondary w-full" onClick={handleJoin} disabled={loading}>Join Room</button>
      </div>
    </div>
  );
}