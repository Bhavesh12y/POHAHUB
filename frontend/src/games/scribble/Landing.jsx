import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';

export default function ScribbleLanding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState(searchParams.get('join')?.toUpperCase() || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    if (!username.trim()) return setError('Enter a username');
    setLoading(true);
    setError('');
    connectSocket();
    const result = await emitWithAck('room:create', { gameType: 'scribble', playerName: username.trim() });
    setLoading(false);
    if (!result.ok) return setError(result.error || 'Failed to create room');
    sessionStorage.setItem('pohahub_username', username.trim());
    navigate(`/games/scribble/room/${result.room.code}`, { state: { room: result.room } });
  };

  const handleJoin = async () => {
    if (!username.trim() || !roomCode.trim()) return setError('Enter username and code');
    setLoading(true);
    setError('');
    connectSocket();
    const result = await emitWithAck('room:join', {
      roomCode: roomCode.trim().toUpperCase(),
      playerName: username.trim(),
    });
    setLoading(false);
    if (!result.ok) return setError(result.error || 'Failed to join');
    sessionStorage.setItem('pohahub_username', username.trim());
    navigate(`/games/scribble/room/${result.room.code}`, { state: { room: result.room } });
  };

  return (
    <div className="max-w-xl mx-auto px-5 py-12 sm:py-16">
      <div className="text-center mb-10">
        <div className="sketch-border inline-flex items-center justify-center w-24 h-24 bg-sky-300 mb-6 overflow-hidden rotate-1">
          <img
            src="https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/scribble.png"
            alt="Scribble Preview"
            className="w-full h-full object-cover"
          />
        </div>
        <h2 className="text-5xl font-black uppercase mb-3 text-ink">Scribble</h2>
        <p className="text-xl text-gray-800 font-bold">Draw your word, guess the art.</p>
      </div>

      <div className="paper-panel bg-white p-6 sm:p-8 space-y-6">
        <div>
          <label className="block text-sm font-black uppercase text-gray-800 mb-2">Username</label>
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
          <div className="sketch-border bg-red-200 px-4 py-3 text-red-900 text-sm font-black">
            {error}
          </div>
        )}

        <button
          type="button"
          className="sketch-button bg-yellow-300 w-full px-6 py-3"
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Create Room'}
        </button>

        <div className="flex items-center gap-4 py-1">
          <div className="h-[3px] flex-1 bg-black" />
          <span className="text-sm font-black uppercase text-gray-800">or join existing</span>
          <div className="h-[3px] flex-1 bg-black" />
        </div>

        <div>
          <label className="block text-sm font-black uppercase text-gray-800 mb-2">Room Code</label>
          <input
            type="text"
            className="input-field uppercase tracking-widest text-center text-xl"
            placeholder="ABC123"
            value={roomCode}
            onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            maxLength={6}
          />
        </div>

        <button
          type="button"
          className="sketch-button bg-pink-300 w-full px-6 py-3"
          onClick={handleJoin}
          disabled={loading}
        >
          Join Room
        </button>
      </div>
    </div>
  );
}
