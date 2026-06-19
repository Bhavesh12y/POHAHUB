import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import socket from '../../lib/socket.js';

export default function TambolaLanding() {
  const [name, setName] = useState(sessionStorage.getItem('playerName') || '');
  const [roomCode, setRoomCode] = useState('');
  const navigate = useNavigate();

  const handleAction = (action) => {
    if (!name.trim()) return alert('Please enter your name.');
    sessionStorage.setItem('playerName', name);
    
    let playerId = sessionStorage.getItem('playerId');
    if (!playerId) {
      playerId = Math.random().toString(36).substring(2, 10);
      sessionStorage.setItem('playerId', playerId);
    }

    if (action === 'create') {
      socket.emit('create_room', { gameType: 'tambola', hostId: playerId, hostName: name });
      socket.once('room_created', (room) => {
        navigate(`/games/tambola/room/${room.code}`);
      });
    } else {
      if (!roomCode.trim()) return alert('Please enter a room code.');
      navigate(`/games/tambola/room/${roomCode.toUpperCase()}`);
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center text-gray-200">
      <div className="max-w-md w-full bg-[#0a0a0c]/80 backdrop-blur-md border border-white/[0.05] p-8 rounded-2xl shadow-2xl">
        <h1 className="text-4xl font-black text-center mb-2 text-white">Tambola</h1>
        <p className="text-gray-400 text-center mb-8">Join a game or host one for your friends.</p>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 transition-colors"
              placeholder="e.g. Bhavesh"
            />
          </div>

          <button
            onClick={() => handleAction('create')}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_15px_rgba(37,99,235,0.3)]"
          >
            Create New Room
          </button>

          <div className="relative flex items-center py-4">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink-0 mx-4 text-gray-500 text-sm">OR</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:border-blue-500 transition-colors uppercase"
              placeholder="ROOM CODE"
              maxLength={6}
            />
            <button
              onClick={() => handleAction('join')}
              className="px-6 bg-white/10 hover:bg-white/20 text-white font-bold rounded-xl transition-all"
            >
              Join
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}