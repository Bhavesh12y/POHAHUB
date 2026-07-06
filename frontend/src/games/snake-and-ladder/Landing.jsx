import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';

export default function SnakeAndLadderLanding() {
  const [searchParams] = useSearchParams();
  const [playerName, setPlayerName] = useState(sessionStorage.getItem('pohahub_username') || '');
  const [roomCode, setRoomCode] = useState(searchParams.get('join')?.toUpperCase() || '');
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
      playerName: playerName.trim(),
    });

    setIsLoading(false);
    if (res.ok) {
      navigate(`/games/snake-and-ladder/room/${res.room.code}`, { state: { room: res.room } });
    } else {
      setError(res.error || 'Failed to create room');
    }
  };
  // Join room handler

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
      playerName: playerName.trim(),
    });

    setIsLoading(false);
    if (res.ok) {
      navigate(`/games/snake-and-ladder/room/${res.room.code}`, { state: { room: res.room } });
    } else {
      setError(res.error || 'Failed to join room');
    }
  };
  

  return (
    <div className="max-w-xl mx-auto px-5 py-12 sm:py-16">
      <div className="text-center mb-10">
        <div className="sketch-border inline-block bg-green-300 px-5 py-3 mb-6 rotate-1">
          <span className="text-[clamp(1.1rem,2.5vw,1.5rem)] font-black uppercase">Snake & Ladder</span>
        </div>
        <h1 className="text-[clamp(1.75rem,5vw,3rem)] font-black uppercase mb-3 text-ink">Multiplayer Edition</h1>
        <p className="text-[clamp(1rem,2vw,1.25rem)] text-gray-800 font-bold">Roll, climb, slide, and race to the top.</p>
      </div>

      <div className="paper-panel bg-white p-6 sm:p-8 space-y-6">
        {error && (
          <div className="sketch-border bg-red-200 px-4 py-3 text-red-900 text-sm text-center font-black">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-black uppercase text-gray-800 mb-2">Your Identity</label>
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

        <button
          onClick={handleCreate}
          disabled={isLoading}
          className="sketch-button bg-yellow-300 w-full px-6 py-3"
        >
          {isLoading ? 'Processing...' : 'Create New Game'}
        </button>

        <div className="flex items-center gap-4 py-1">
          <div className="h-[3px] flex-1 bg-black" />
          <span className="text-sm font-black uppercase text-gray-800">or</span>
          <div className="h-[3px] flex-1 bg-black" />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            placeholder="ROOM CODE"
            className="input-field uppercase text-center text-xl sm:w-2/3"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            disabled={isLoading}
            maxLength={6}
          />
          <button
            onClick={handleJoin}
            disabled={isLoading || !roomCode}
            className="sketch-button bg-pink-300 px-6 py-3 sm:w-1/3"
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
