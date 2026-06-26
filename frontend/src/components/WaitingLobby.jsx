import { useState } from 'react';
import QRCode from 'react-qr-code';
import { emitWithAck } from '../lib/socket.js';

export default function WaitingLobby({ roomCode, isHost, playerCount, players = [], onStart }) {
  const [copied, setCopied] = useState(false);
  const [broadcasting, setBroadcasting] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');

  // Safely get the exact URL
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
        console.log('USER CANCELED SHARE', err);
      }
    } else {
      copyLink();
    }
  };

  // The Proximity Radar Broadcaster
  const broadcastLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('GEOLOCATION NOT SUPPORTED BY BROWSER');
      return;
    }

    setLocationStatus('ACQUIRING GPS COORDINATES...');
    setBroadcasting(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setLocationStatus('BROADCASTING TO NEARBY PLAYERS...');
        try {
          // Send coordinates and room details to your backend
          await emitWithAck('room:broadcast_location', {
            roomCode: roomCode,
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            url: roomUrl
          });
        } catch (error) {
          console.error("BROADCAST FAILED:", error);
          setLocationStatus('RADAR BROADCAST FAILED');
          setBroadcasting(false);
        }
      },
      (error) => {
        console.error(error);
        setLocationStatus('LOCATION PERMISSION DENIED');
        setBroadcasting(false);
      },
      { enableHighAccuracy: true } // Forces GPS hardware for better precision
    );
  };

  return (
    <div className="flex items-center justify-center min-h-[80vh] py-16 px-4">
      <div className="paper-panel w-full max-w-2xl mx-auto px-5 py-10 sm:px-8 sm:py-14 text-center flex flex-col items-center justify-center bg-white">
        
        <div className="sketch-border bg-yellow-300 px-4 py-2 mb-6 -rotate-2">
          <span className="text-[clamp(1rem,3vw,1.5rem)] font-black uppercase">Room Code: {roomCode}</span>
        </div>

        <h2 className="text-[clamp(1.25rem,3vw,2rem)] font-black uppercase text-ink mb-2">
          Invite Friends
        </h2>
        <p className="text-[clamp(0.875rem,1.8vw,1.125rem)] text-gray-800 mb-6 font-bold px-4 uppercase">
          Scan QR, Share Link, Or Broadcast Locally
        </p>

        {/* QR Code Section */}
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
            <button onClick={copyLink} className="sketch-button bg-sky-200 px-5 py-3 text-xs sm:text-sm shrink-0 uppercase">
              {copied ? 'COPIED!' : 'COPY LINK'}
            </button>
            <button onClick={shareLink} className="sketch-button bg-green-300 px-5 py-3 text-xs sm:text-sm shrink-0 uppercase">
              SHARE
            </button>
          </div>

          {isHost && (
            <button 
              onClick={broadcastLocation} 
              disabled={broadcasting}
              className={`sketch-button w-full px-5 py-3 text-xs sm:text-sm transition-all uppercase ${
                broadcasting 
                  ? 'bg-purple-400 opacity-90 cursor-default hover:translate-y-0 hover:translate-x-0' 
                  : 'bg-purple-200'
              }`}
            >
              {broadcasting ? 'RADAR ACTIVE...' : 'BROADCAST TO NEARBY PLAYERS (for phone to phone only)'}
            </button>
          )}

        </div>

        {/* Location Status Indicator */}
        <div className="h-6 mb-6">
          {locationStatus && (
            <p className={`font-black uppercase text-sm tracking-wide ${broadcasting && locationStatus.includes('BROADCASTING') ? 'text-green-600 animate-pulse' : 'text-purple-600'}`}>
              {locationStatus}
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
                  className="sketch-border bg-green-200 px-3 py-1.5 text-sm text-ink font-bold flex items-center gap-2 uppercase"
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
          <button className="sketch-button bg-yellow-300 w-full sm:w-auto px-10 py-3 uppercase" onClick={onStart} disabled={playerCount < 2}>
            START GAME
          </button>
        ) : (
          <p className="text-gray-800 uppercase tracking-wide text-sm sm:text-base font-black">
            WAITING FOR HOST TO START...
          </p>
        )}

      </div>
    </div>
  );
}
