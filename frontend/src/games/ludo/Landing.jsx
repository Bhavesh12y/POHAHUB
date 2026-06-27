import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';

export default function LudoLanding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState(
    searchParams.get('join')?.toUpperCase() || ''
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

    const result = await emitWithAck('room:create', {
      gameType: 'ludo',
      playerName: username.trim(),
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error || 'Failed to create room');
      return;
    }

    localStorage.setItem('pohahub_username', username.trim());

    navigate(`/games/ludo/room/${result.room.code}`, {
      state: { room: result.room },
    });
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

    navigate(`/games/ludo/room/${result.room.code}`, {
      state: { room: result.room },
    });
  };

  return (
    <div className="max-w-xl mx-auto px-5 py-12 sm:py-16">

      <div className="text-center mb-10">

        {/* Ludo Icon */}
        <div className="mx-auto mb-6 grid grid-cols-2 gap-1 w-16 h-16 rotate-45">
          <div className="bg-red-500 rounded-sm"></div>
          <div className="bg-blue-500 rounded-sm"></div>
          <div className="bg-green-500 rounded-sm"></div>
          <div className="bg-yellow-400 rounded-sm"></div>
        </div>

        <div className="inline-block rotate-[-1deg]">
          <div className="bg-green-300 border-[3px] border-black px-6 py-3 shadow-[6px_6px_0px_#000]">
            <h2 className="text-[clamp(1.2rem,3vw,2rem)] font-black uppercase tracking-wide text-black">
              Ludo
            </h2>
          </div>
        </div>

        <p className="text-[clamp(1rem,2vw,1.25rem)] text-gray-800 font-bold mt-4">
          Create a room or invite your friends using a room code.
        </p>
      </div>

      <div className="paper-panel bg-white p-6 sm:p-8 space-y-6">

        <div>
          <label className="block text-sm font-black uppercase text-gray-800 mb-2">
            Username
          </label>

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
          className="sketch-button bg-green-300 w-full px-6 py-3"
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Create Room'}
        </button>

        <div className="flex items-center gap-4 py-1">
          <div className="h-[3px] flex-1 bg-black" />
          <span className="text-sm font-black uppercase text-gray-800">
            or join existing
          </span>
          <div className="h-[3px] flex-1 bg-black" />
        </div>

        <div>
          <label className="block text-sm font-black uppercase text-gray-800 mb-2">
            Room Code
          </label>

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
          className="sketch-button bg-yellow-300 w-full px-6 py-3"
          onClick={handleJoin}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Join Room'}
        </button>

      </div>

    </div>
  );
}