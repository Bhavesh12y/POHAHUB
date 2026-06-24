import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { emitWithAck } from '../../lib/socket.js';

export default function Landing() {
  const [playerName, setPlayerName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    if (!playerName.trim() || isLoading) return;
    setIsLoading(true);
    sessionStorage.setItem('pohahub_username', playerName.trim());
    const res = await emitWithAck('room:create', { gameType: 'stone-paper-scissor', playerName: playerName.trim() });
    if (res.ok) navigate(`/games/stone-paper-scissor/room/${res.room.code}`, { state: { room: res.room } });
    setIsLoading(false);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16 animate-[popIn_0.5s_cubic-bezier(0.175,0.885,0.32,1.275)_forwards]">
      <style>{`@keyframes popIn { 0% { opacity: 0; transform: scale(0.9) translateY(20px) rotate(-3deg); } 100% { opacity: 1; transform: scale(1) translateY(0) rotate(1deg); } }`}</style>
      <div className="bg-white border-[4px] border-black shadow-[12px_12px_0px_#000] p-8 -rotate-1 rounded-lg">
        <div className="bg-[#fbbf24] border-[3px] border-black p-4 mb-8 -mx-4 mt-[-2rem] shadow-[4px_4px_0px_#000] rotate-2">
          <h1 className="text-3xl font-black uppercase text-center tracking-widest text-black">Stone Paper Scissor</h1>
        </div>
        <form onSubmit={handleCreateRoom} className="space-y-6">
          <div>
            <label className="block text-sm font-black uppercase tracking-widest text-gray-700 mb-2">Your Name</label>
            <input type="text" required value={playerName} onChange={(e) => setPlayerName(e.target.value)} maxLength={15}
              className="w-full text-xl font-bold p-4 bg-gray-50 border-[3px] border-black rounded shadow-[inset_3px_3px_0px_rgba(0,0,0,0.1)] focus:outline-none focus:ring-4 focus:ring-[#f87171]" placeholder="Player 1" />
          </div>
          <button type="submit" disabled={isLoading}
            className="w-full bg-[#f87171] text-black font-black text-xl uppercase tracking-widest py-4 border-[3px] border-black rounded shadow-[6px_6px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[4px_4px_0px_#000] transition-all disabled:opacity-50">
            {isLoading ? 'Creating Room...' : 'Create Room'}
          </button>
        </form>
      </div>
    </div>
  );
}