import { useState } from 'react';

export default function WaitingLobby({ roomCode, isHost, playerCount, onStart, gamePath }) {
  const [copied, setCopied] = useState(false);

  const copyLink = () => {
    // Automatically uses whatever gamePath you pass it!
    navigator.clipboard.writeText(`${window.location.origin}/games/${gamePath}/${roomCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="text-center py-12 sm:py-20 border border-dashed border-white/[0.1] rounded-3xl bg-[#0a0a0c]/50 flex flex-col items-center justify-center">
      <div className="mb-6 drop-shadow-[0_0_15px_rgba(255,255,255,0.2)] text-4xl">🔗</div>
      <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">Invite Friends</h2>
      <p className="text-sm text-gray-400 mb-6 font-light px-4">Share this link to let friends join directly.</p>
      
      <div className="flex items-center justify-center gap-2 w-full max-w-sm px-4 mb-8">
        <input 
            type="text" 
            readOnly 
            value={`${window.location.origin}/games/${gamePath}/${roomCode}`}
            className="input-field text-xs sm:text-sm text-center w-full bg-black/50 border-white/10"
            onClick={(e) => e.target.select()}
        />
        <button onClick={copyLink} className="btn-secondary py-2.5 px-4 text-xs sm:text-sm shrink-0 whitespace-nowrap border border-white/10">
            {copied ? '✅ Copied' : 'Copy Link'}
        </button>
      </div>

      {isHost ? (
        <button className="btn-primary w-[80%] sm:w-auto px-10" onClick={onStart} disabled={playerCount < 2}>
          Start Game
        </button>
      ) : (
        <p className="text-gray-500 animate-pulse uppercase tracking-widest text-xs sm:text-sm">Waiting for host to start...</p>
      )}
    </div>
  );
}