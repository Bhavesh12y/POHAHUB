import { useState, useEffect, useCallback } from 'react';
import QRCode from 'react-qr-code';

export default function WaitingLobby({ roomCode, isHost, playerCount, players = [], onStart }) {
  const [copied, setCopied] = useState(false);
  const [nfcStatus, setNfcStatus] = useState('');
  const [nfcActive, setNfcActive] = useState(false);

  // Safely get the URL
  const roomUrl = typeof window !== 'undefined' ? window.location.href : '';

  const copyLink = () => {
    navigator.clipboard.writeText(roomUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareLink = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join my match on PohaHub',
          text: 'Click the link to join my game room:',
          url: roomUrl,
        });
      } catch (err) {
        console.log('User canceled share', err);
      }
    } else {
      copyLink();
    }
  };

  // The NFC Activation Logic
  const activateNFC = useCallback(async () => {
    if (!isHost || !('NDEFReader' in window) || nfcActive) return;

    try {
      const ndef = new NDEFReader();
      await ndef.write({
        records: [{ recordType: "url", data: roomUrl }]
      });
      
      setNfcActive(true);
      setNfcStatus('NFC Active: Bring phones together');
    } catch (error) {
      console.error("NFC activation failed:", error);
      if (!nfcActive) {
        setNfcStatus('Tap anywhere on screen to enable NFC');
      }
    }
  }, [isHost, roomUrl, nfcActive]);

  // "Auto-Start" Hook: Triggers NFC on the very first screen interaction
  useEffect(() => {
    if (!isHost) return;

    activateNFC();

    const handleFirstInteraction = () => {
      activateNFC();
    };

    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);

    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
    };
  }, [isHost, activateNFC]);

  return (
    <div className="flex items-center justify-center min-h-[80vh] py-16 px-4">
      <div className="paper-panel w-full max-w-2xl mx-auto px-5 py-10 sm:px-8 sm:py-14 text-center flex flex-col items-center justify-center bg-white">
        
        <div className="sketch-border bg-yellow-300 px-4 py-2 mb-6 -rotate-2">
          <span className="text-[clamp(1rem,3vw,1.5rem)] font-black uppercase">Room Code: {roomCode}</span>
        </div>

        <h2 className="text-[clamp(1.25rem,3vw,2rem)] font-black uppercase text-ink mb-2">
          Invite Friends
        </h2>
        <p className="text-[clamp(0.875rem,1.8vw,1.125rem)] text-gray-800 mb-6 font-bold px-4">
          Scan the QR, touch phones, or share the link to join!
        </p>

        {/* QR Code Section matching sketch theme */}
        <div className="sketch-border bg-white p-4 mb-8 rotate-1 hover:rotate-0 transition-transform">
          <QRCode value={roomUrl} size={160} level="H" className="mx-auto" />
        </div>

        {/* Action Buttons Layout */}
        <div className="flex flex-col w-full max-w-xl mb-4 gap-3">
          
          <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3 w-full">
            <input
              type="text"
              readOnly
              value={roomUrl} 
              className="input-field text-xs sm:text-sm text-center flex-1"
              onClick={(e) => e.target.select()}
            />
            <button onClick={copyLink} className="sketch-button bg-sky-200 px-5 py-3 text-xs sm:text-sm shrink-0">
              {copied ? 'Copied!' : 'Copy Link'}
            </button>
            <button onClick={shareLink} className="sketch-button bg-green-300 px-5 py-3 text-xs sm:text-sm shrink-0">
              Share
            </button>
          </div>

          {isHost && (
            <button 
              onClick={activateNFC} 
              disabled={nfcActive}
              className={`sketch-button w-full px-5 py-3 text-xs sm:text-sm transition-all ${
                nfcActive 
                  ? 'bg-purple-400 opacity-90 cursor-default hover:translate-y-0 hover:translate-x-0' 
                  : 'bg-purple-200'
              }`}
            >
              {nfcActive ? 'NFC Broadcasting...' : 'Tap to Start NFC'}
            </button>
          )}

        </div>

        {/* NFC Status Indicator */}
        <div className="h-6 mb-6">
          {nfcStatus && (
            <p className={`font-black uppercase text-sm tracking-wide ${nfcActive ? 'text-green-600 animate-pulse' : 'text-purple-600'}`}>
              {nfcStatus}
            </p>
          )}
        </div>

        {/* Players List */}
        {players.length > 0 && (
          <div className="w-full max-w-md mb-8">
            <h3 className="text-sm text-gray-800 uppercase tracking-wide mb-4 font-black">
              Players in Lobby ({players.length})
            </h3>
            <div className="flex flex-wrap justify-center gap-3">
              {players.map((player, idx) => (
                <div
                  key={player.id || idx}
                  className="sketch-border bg-green-200 px-3 py-1.5 text-sm text-ink font-bold flex items-center gap-2"
                >
                  <span className="inline-block h-2 w-2 bg-green-600 border-2 border-black" />
                  {player.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Host Controls */}
        {isHost ? (
          <button className="sketch-button bg-yellow-300 w-full sm:w-auto px-10 py-3" onClick={onStart} disabled={playerCount < 2}>
            Start Game
          </button>
        ) : (
          <p className="text-gray-800 uppercase tracking-wide text-sm sm:text-base font-black">
            Waiting for host to start...
          </p>
        )}

      </div>
    </div>
  );
}