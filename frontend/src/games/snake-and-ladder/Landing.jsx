import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';

export default function SnakeAndLadderLanding() {
  const [playerName, setPlayerName] = useState(sessionStorage.getItem('pohahub_username') || '');
  const [roomCode, setRoomCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!playerName.trim()) return setError('Please enter your name');
    
    setIsLoading(true);
    sessionStorage.setItem('pohahub_username', playerName.trim());
    
    const socket = connectSocket();
    if (!socket.connected) socket.connect();

    const res = await emitWithAck('room:create', { 
      gameType: 'snake-and-ladder', 
      playerName: playerName.trim() 
    });

    setIsLoading(false);
    if (res.ok) {
      navigate(`/games/snake-and-ladder/${res.room.code}`, { state: { room: res.room } });
    } else {
      setError(res.error || 'Failed to create room');
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    if (!playerName.trim()) return setError('Please enter your name');
    if (!roomCode.trim()) return setError('Please enter a room code');

    setIsLoading(true);
    sessionStorage.setItem('pohahub_username', playerName.trim());

    const socket = connectSocket();
    if (!socket.connected) socket.connect();

    const res = await emitWithAck('room:join', { 
      roomCode: roomCode.toUpperCase().trim(), 
      playerName: playerName.trim() 
    });

    setIsLoading(false);
    if (res.ok) {
      navigate(`/games/snake-and-ladder/${res.room.code}`, { state: { room: res.room } });
    } else {
      setError(res.error || 'Failed to join room');
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 sm:mt-24 p-6 sm:p-10 glass-card rounded-3xl bg-[#0a0a0c]/80 border border-white/[0.05] shadow-[0_0_50px_rgba(0,0,0,0.5)] relative overflow-hidden">
      
      {/* Decorative Background Elements */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none" />
      <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="relative z-10 text-center mb-10">
        <div className="text-5xl mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] animate-bounce">🐍</div>
        <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tighter text-white mb-2">Snake & Ladder</h1>
        <p className="text-sm font-light tracking-widest uppercase text-gray-400">Multiplayer Edition</p>
      </div>

      {error && (
        <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center font-medium animate-pop-in">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-bold tracking-[0.2em] uppercase text-gray-500 mb-2 ml-1">Your Identity</label>
          <input
            type="text"
            placeholder="Enter your name"
            className="input-field"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            disabled={isLoading}
            maxLength={15}
          />
        </div>

        <button onClick={handleCreate} disabled={isLoading} className="btn-primary w-full shadow-[0_0_20px_rgba(16,185,129,0.2)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)]">
          {isLoading ? 'Processing...' : 'Create New Game'}
        </button>

        <div className="relative flex items-center py-2">
          <div className="flex-grow border-t border-white/[0.05]"></div>
          <span className="flex-shrink-0 mx-4 text-[10px] font-bold tracking-[0.2em] uppercase text-gray-600">OR</span>
          <div className="flex-grow border-t border-white/[0.05]"></div>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="ROOM CODE"
            className="input-field uppercase text-center font-mono placeholder:normal-case placeholder:font-sans w-2/3"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            disabled={isLoading}
            maxLength={6}
          />
          <button onClick={handleJoin} disabled={isLoading || !roomCode} className="btn-secondary w-1/3">
            Join
          </button>
        </div>
      </div>
    </div>
  );
}