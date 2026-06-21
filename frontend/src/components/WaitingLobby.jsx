import { useState } from 'react';

export default function WaitingLobby({ roomCode, isHost, playerCount, players = [], onStart }) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    // navigator.clipboard grabs the exact current URL from the browser
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="paper-panel max-w-2xl mx-auto px-5 py-10 sm:px-8 sm:py-14 text-center flex flex-col items-center justify-center bg-white">
      <div className="sketch-border bg-yellow-300 px-4 py-2 mb-6 -rotate-2">
        <span className="text-[clamp(1rem,3vw,1.5rem)] font-black uppercase">Room Code: {roomCode}</span>
      </div>

      <h2 className="text-[clamp(1.25rem,3vw,2rem)] font-black uppercase text-ink mb-2">
        Invite Friends
      </h2>
      <p className="text-[clamp(0.875rem,1.8vw,1.125rem)] text-gray-800 mb-6 font-bold px-4">
        Share this link to let friends join directly.
      </p>

      <div className="flex flex-col sm:flex-row items-stretch justify-center gap-3 w-full max-w-xl mb-8">
        <input
          type="text"
          readOnly
          // window.location.href forces the input to display the exact address bar URL
          value={typeof window !== 'undefined' ? window.location.href : ''} 
          className="input-field text-xs sm:text-sm text-center"
          onClick={(e) => e.target.select()}
        />
        <button onClick={copyLink} className="sketch-button bg-sky-200 px-5 py-3 text-xs sm:text-sm shrink-0">
          {copied ? 'Copied!' : 'Copy Link'}
        </button>
      </div>

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
  );
}