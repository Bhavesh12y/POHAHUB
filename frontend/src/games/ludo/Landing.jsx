import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../../lib/socket.js';

export default function LudoLanding() {
  const [playerName, setPlayerName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [mode, setMode] = useState('create'); // 'create' or 'join'
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { socket } = useSocket();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!playerName.trim()) {
      alert("Please enter your name first!");
      return;
    }

    setIsLoading(true);

    if (mode === 'create') {
      // Emit to backend RoomManager's createRoom
      socket.emit('createRoom', { 
        gameType: 'ludo', 
        playerName: playerName.trim() 
      }, (response) => {
        setIsLoading(false);
        if (response.ok) {
          navigate(`/games/ludo/room/${response.room.code}`);
        } else {
          alert(response.error || "Failed to create room");
        }
      });
    } else {
      if (!roomCode.trim()) {
        alert("Please enter a room code to join.");
        setIsLoading(false);
        return;
      }
      
      // Emit to backend RoomManager's joinRoom
      socket.emit('joinRoom', {
        roomCode: roomCode.toUpperCase().trim(),
        playerName: playerName.trim()
      }, (response) => {
        setIsLoading(false);
        if (response.ok) {
          navigate(`/games/ludo/room/${response.room.code}`);
        } else {
          alert(response.error || "Failed to join room. It might be full or invalid.");
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      
      {/* Decorative Ludo Icon */}
      <div className="grid grid-cols-2 gap-1 mb-6 w-16 h-16 transform rotate-45">
        <div className="bg-red-500 rounded-sm"></div>
        <div className="bg-blue-500 rounded-sm"></div>
        <div className="bg-green-500 rounded-sm"></div>
        <div className="bg-yellow-400 rounded-sm"></div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <h1 className="text-3xl font-extrabold text-center text-gray-800 mb-2">Ludo</h1>
        <p className="text-center text-gray-500 mb-8">Roll the dice and race your tokens home!</p>

        {/* Toggle Create / Join */}
        <div className="flex bg-gray-100 p-1 rounded-lg mb-6">
          <button
            onClick={() => setMode('create')}
            className={`flex-1 py-2 font-medium rounded-md transition-all ${
              mode === 'create' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Create Game
          </button>
          <button
            onClick={() => setMode('join')}
            className={`flex-1 py-2 font-medium rounded-md transition-all ${
              mode === 'join' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Join Game
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Your Name
            </label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="Enter your display name"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none"
              maxLength={15}
              required
            />
          </div>

          {mode === 'join' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Room Code
              </label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="e.g. A1B2C3"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all outline-none uppercase tracking-wider"
                maxLength={6}
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 px-4 rounded-lg transition-colors disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
          >
            {isLoading ? (
              <span className="animate-pulse">Connecting...</span>
            ) : mode === 'create' ? (
              'Generate Room Code'
            ) : (
              'Join Room'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}