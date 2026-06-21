import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';

export default function ConnectFourLanding() {
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
    if (!username.trim()) {
      setError('Enter a username');
      return;
    }

    setLoading(true);
    setError('');
    connectSocket();

    const result = await emitWithAck('room:create', {
      gameType: 'connect-four',
      playerName: username.trim(),
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error || 'Failed to create room');
      return;
    }

    localStorage.setItem('pohahub_username', username.trim());
    navigate(`/games/connect-four/room/${result.room.code}`, { state: { room: result.room } });
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
    navigate(`/games/connect-four/room/${result.room.code}`, { state: { room: result.room } });
  };

  return (
    <div className="max-w-xl mx-auto px-5 py-12 sm:py-16">
      <div className="text-center mb-10">
        <div className="sketch-border inline-flex items-center justify-center w-[clamp(4rem,10vw,6rem)] aspect-square bg-violet-300 mb-6 overflow-hidden -rotate-2">
          <img
            src="https://raw.githubusercontent.com/Bhavesh12y/imagessc/refs/heads/main/Logo%20(1).png"
            alt="Connect 4 Preview"
            className="w-full h-full object-cover"
          />
        </div>

        <h2 className="text-[clamp(1.75rem,5vw,3rem)] font-black uppercase mb-3 text-ink"><div className="inline-block rotate-[-1deg]">
  <div className="bg-pink-300 border-[3px] border-black px-6 py-3 shadow-[6px_6px_0px_#000]">
    <h2 className="text-[clamp(1.2rem,3vw,2rem)] font-black uppercase tracking-wide text-black">
      Connect 4
    </h2>
  </div>
</div></h2>
        <p className="text-[clamp(1rem,2vw,1.25rem)] text-gray-800 font-bold">Create a room or join with a friend's code.</p>
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
