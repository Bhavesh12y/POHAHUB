import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';
import QrScannerModal from '../../components/QrScannerModal.jsx';

export default function RajaMantriLanding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState(
    searchParams.get('join')?.toUpperCase() || ''
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showScanner, setShowScanner] = useState(false);

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
      gameType: 'raja-mantri',
      playerName: username.trim(),
    });

    setLoading(false);

    if (!result.ok) {
      setError(result.error || 'Failed to create room');
      return;
    }

    localStorage.setItem('pohahub_username', username.trim());
    navigate(`/games/raja-mantri/room/${result.room.code}`, {
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
    navigate(`/games/raja-mantri/room/${result.room.code}`, {
      state: { room: result.room },
    });
  };

  return (
    <div className="max-w-xl mx-auto px-5 py-12 sm:py-16">
      <div className="text-center mb-10">
        <div className="inline-block -rotate-2 mb-4">
          <span className="text-6xl">👑📜⚔️🦹</span>
        </div>
        <div className="inline-block rotate-[-1deg]">
          <div className="bg-[#facc15] border-[3px] border-black px-6 py-3 shadow-[6px_6px_0px_#000]">
            <h2 className="text-[clamp(1.2rem,3vw,2rem)] font-black uppercase tracking-wide text-black">
              Raja Mantri Chor Sipahi
            </h2>
          </div>
        </div>

        <p className="text-[clamp(1rem,2vw,1.25rem)] text-gray-800 font-bold mt-4">
          The legendary 4-player royal chit game! Play 5 rounds and catch the thief.
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
          className="sketch-button bg-[#facc15] w-full px-6 py-3"
          onClick={handleCreate}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Create 4-Player Room'}
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
          <div className="flex gap-2">
            <input
              type="text"
              className="input-field uppercase tracking-widest text-center text-xl flex-1"
              placeholder="ABC123"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={8}
            />
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="sketch-button bg-purple-300 px-3.5 py-2 text-xs font-black uppercase flex items-center gap-1.5 shrink-0"
              title="Scan Room QR Code"
            >
              <span>📷</span>
              <span>Scan QR</span>
            </button>
          </div>
        </div>

        <button
          type="button"
          className="sketch-button bg-sky-300 w-full px-6 py-3"
          onClick={handleJoin}
          disabled={loading}
        >
          {loading ? 'Connecting...' : 'Join Room'}
        </button>

        <QrScannerModal
          isOpen={showScanner}
          onClose={() => setShowScanner(false)}
          onScan={(scannedCode) => {
            setRoomCode(scannedCode);
          }}
        />
      </div>
    </div>
  );
}
