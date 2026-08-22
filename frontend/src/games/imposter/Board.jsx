import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby.jsx';
import VoiceChat from '../../components/VoiceChat.jsx';
import ChatPanel from '../../components/ChatPanel.jsx';
import confetti from 'canvas-confetti';

export default function ImposterBoard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [clueInput, setClueInput] = useState('');
  const [imposterGuessInput, setImposterGuessInput] = useState('');
  const [selectedVoteTarget, setSelectedVoteTarget] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [showChatDrawer, setShowChatDrawer] = useState(false);

  useEffect(() => {
    const socket = connectSocket();
    const username = localStorage.getItem('pohahub_username') || sessionStorage.getItem('pohahub_username');
    if (!username) {
      navigate(`/games/imposter?join=${roomCode}`);
      return;
    }

    const syncRoom = async () => {
      const res = await emitWithAck('room:join', { roomCode: roomCode.toUpperCase(), playerName: username });
      if (res.ok) setRoom(res.room);
    };

    socket.on('connect', syncRoom);
    socket.on('room:update', (updatedRoom) => {
      if (updatedRoom.code === roomCode?.toUpperCase()) setRoom(updatedRoom);
    });
    socket.on('chat:message', (msg) => {
      setRoom((prev) => prev ? { ...prev, chat: [...(prev.chat ?? []), msg] } : prev);
    });

    if (socket.connected) syncRoom();
    else socket.connect();

    return () => {
      socket.off('connect');
      socket.off('room:update');
      socket.off('chat:message');
    };
  }, [roomCode, navigate]);

  const gameState = room?.gameState;
  const myPlayerId = room?.viewerId;
  const isHost = room?.hostId === myPlayerId;
  const isMyClueTurn = gameState?.roundPhase === 'clue_phase' && gameState?.clueOrder?.[gameState?.currentClueIndex] === myPlayerId;
  const isImposter = gameState?.secretWord === '???';

  // Find imposter player object for end-game reveal
  const imposterPlayer = room?.players?.find(p => p.id === gameState?.imposterId);

  useEffect(() => {
    if (gameState?.roundPhase === 'game_over') {
      confetti({ particleCount: 80, spread: 90, origin: { y: 0.55 } });
    }
  }, [gameState?.roundPhase]);

  const handleStart = async () => {
    setActionLoading(true);
    const res = await emitWithAck('room:start', {});
    setActionLoading(false);
    if (!res.ok) setError(res.error || 'Failed to initiate mission');
  };

  const handleAction = async (action, payload = {}) => {
    setActionLoading(true);
    const res = await emitWithAck('game:move', { action, ...payload });
    setActionLoading(false);
    if (!res.ok) setError(res.error || 'Action failed');
    else {
      setError('');
      if (action === 'submit_clue') setClueInput('');
      if (action === 'imposter_guess_word') setImposterGuessInput('');
    }
  };

  const handleChat = (message) => emitWithAck('chat:message', { message });

  if (!room) {
    return (
      <div className="min-h-screen bg-[#070b14] flex flex-col items-center justify-center text-cyan-400 font-mono">
        <div className="w-16 h-16 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mb-4" />
        <span className="text-base font-black tracking-widest uppercase animate-pulse">
          CONNECTING TO ENCRYPTED SPY FREQUENCY...
        </span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1550px] mx-auto px-2 sm:px-4 py-3 font-sans select-none text-slate-100">
      <style>{`
        @keyframes radarScan {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-radar {
          animation: radarScan 4s linear infinite;
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 15px rgba(239, 68, 68, 0.4); }
          50% { box-shadow: 0 0 30px rgba(239, 68, 68, 0.8); }
        }
        .animate-danger-glow {
          animation: pulseGlow 1.8s infinite;
        }
      `}</style>

      {/* CYBER TOP HEADER BAR */}
      <div className="bg-[#0b1120] border-[3px] border-cyan-500/80 rounded-2xl p-3 sm:p-4 shadow-[0_0_20px_rgba(6,182,212,0.25)] mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950 border-2 border-cyan-400 flex items-center justify-center text-xl shadow-[0_0_10px_rgba(34,211,238,0.5)]">
            🕵️‍♂️
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl font-black uppercase tracking-wider text-cyan-300 font-mono">
                WORD IMPOSTER
              </h1>
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-900/80 text-cyan-300 border border-cyan-500">
                TOP SECRET
              </span>
            </div>
            <p className="text-[11px] font-bold text-gray-400 font-mono">
              CHANNEL: <span className="text-white font-black bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">{room.code}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <VoiceChat roomCode={room.code} />
          {gameState && (
            <div className="bg-[#0f172a] border-2 border-cyan-500/60 px-3 py-1 rounded-xl text-center font-mono">
              <span className="text-[9px] text-cyan-400 uppercase block font-bold">PHASE</span>
              <span className="text-xs sm:text-sm font-black text-yellow-300 uppercase">
                {gameState.roundPhase === 'voting' ? '🗳️ TRIBUNAL' : gameState.roundPhase === 'game_over' ? '🏁 DEBRIEF' : `ROUND ${gameState.clueRound}/2`}
              </span>
            </div>
          )}
          <button
            onClick={() => setShowChatDrawer(!showChatDrawer)}
            className="lg:hidden bg-cyan-900/60 border border-cyan-400 px-3 py-1.5 rounded-xl text-xs font-black"
          >
            💬
          </button>
        </div>
      </div>

      {/* LOBBY OR ACTIVE ESPIONAGE ARENA */}
      {room.status === 'waiting' ? (
        <WaitingLobby
          roomCode={room.code}
          isHost={isHost}
          playerCount={room.players.length}
          players={room.players}
          onStart={handleStart}
          gamePath="imposter/room"
        />
      ) : (
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          
          {/* MAIN MISSION HQ CONTAINER */}
          <div className="flex-1 w-full flex flex-col gap-4">

            {/* 1. MISSION IDENTITY HUD (HERO BANNER) */}
            <div
              className={`border-[3px] rounded-2xl p-4 sm:p-6 shadow-2xl relative overflow-hidden transition-all ${
                isImposter
                  ? 'bg-gradient-to-br from-[#1c0a0a] via-[#2d0e0e] to-[#0f0404] border-red-500/90 animate-danger-glow'
                  : 'bg-gradient-to-br from-[#061e29] via-[#092938] to-[#041118] border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.3)]'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3 mb-4">
                <span className="text-xs font-mono font-black uppercase tracking-widest text-cyan-400 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                  CATEGORY / DOSSIER: <span className="text-yellow-300 text-sm">{gameState.category}</span>
                </span>
                <span className="text-[10px] font-mono text-gray-400 uppercase bg-black/40 px-2.5 py-1 rounded border border-white/10">
                  {gameState.roundPhase === 'word_reveal' ? 'MISSION STATUS: BRIEFING' : 'MISSION STATUS: LIVE OPERATIONS'}
                </span>
              </div>

              {isImposter ? (
                /* IMPOSTER HUD */
                <div className="text-center py-2">
                  <span className="text-4xl sm:text-5xl block mb-1">🎭⚠️</span>
                  <h2 className="text-xl sm:text-3xl font-black text-red-500 uppercase tracking-widest font-mono mb-1">
                    YOU ARE THE UNDERCOVER IMPOSTER!
                  </h2>
                  <p className="text-xs sm:text-sm font-semibold text-red-200 max-w-xl mx-auto">
                    You only know the category <strong className="text-yellow-300">"{gameState.category}"</strong>. Blend in with smart 1-word clues or crack the secret word below!
                  </p>
                </div>
              ) : (
                /* DETECTIVE HUD */
                <div className="text-center py-2">
                  <span className="text-3xl sm:text-4xl block mb-1">🔎🛰️</span>
                  <span className="text-xs font-mono uppercase text-cyan-400 font-black tracking-widest">
                    DECRYPTED SECRET WORD
                  </span>
                  <h2 className="text-3xl sm:text-5xl font-black text-emerald-400 uppercase tracking-widest font-mono my-1 drop-shadow-[0_0_12px_rgba(52,211,153,0.6)]">
                    {gameState.secretWord}
                  </h2>
                  <p className="text-xs sm:text-sm font-medium text-gray-300 max-w-xl mx-auto">
                    Give 2 subtle 1-word clues to prove your innocence without giving the word away to the hidden Imposter!
                  </p>
                </div>
              )}

              {/* MISSION START BUTTON (WORD REVEAL PHASE) */}
              {gameState.roundPhase === 'word_reveal' && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => handleAction('start_clues')}
                    disabled={actionLoading}
                    className="px-8 py-3 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black uppercase text-xs sm:text-sm rounded-xl border-2 border-black shadow-[0_0_15px_rgba(250,204,21,0.5)] transition-transform hover:scale-105 active:scale-95 font-mono"
                  >
                    🚀 COMMENCE ROUND 1 OF 1-WORD CLUES
                  </button>
                </div>
              )}
            </div>

            {/* 2. PARALLEL IMPOSTER HACK / ANYTIME GUESS TERMINAL */}
            {gameState.roundPhase !== 'game_over' && (
              <div className="bg-[#0f172a]/95 border-2 border-amber-500/70 rounded-2xl p-4 sm:p-5 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-500/20 pb-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">⚡</span>
                    <span className="text-xs sm:text-sm font-black uppercase text-amber-300 font-mono">
                      IMPOSTER SECRET WORD HIJACK TERMINAL
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3].map((num) => (
                      <span
                        key={num}
                        className={`w-4 h-4 rounded-full border border-black flex items-center justify-center text-[9px] font-black ${
                          num <= (gameState.imposterAttemptsLeft ?? 3)
                            ? 'bg-amber-400 text-black animate-pulse'
                            : 'bg-gray-700 text-gray-500'
                        }`}
                      >
                        ⚡
                      </span>
                    ))}
                    <span className="text-[11px] font-mono font-bold text-amber-300 ml-1">
                      {gameState.imposterAttemptsLeft ?? 3}/3 CHARGES
                    </span>
                  </div>
                </div>

                {isImposter ? (
                  <div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        placeholder="TYPE SECRET WORD TO STEAL INSTANT WIN..."
                        value={imposterGuessInput}
                        onChange={(e) => setImposterGuessInput(e.target.value)}
                        maxLength={30}
                        className="flex-1 bg-black/80 border-2 border-red-500/80 rounded-xl px-4 py-2.5 text-sm font-black font-mono text-red-300 placeholder-red-700/60 uppercase focus:outline-none focus:ring-2 focus:ring-red-400"
                      />
                      <button
                        onClick={() => imposterGuessInput.trim() && handleAction('imposter_guess_word', { guess: imposterGuessInput.trim() })}
                        disabled={!imposterGuessInput.trim() || actionLoading || gameState.imposterAttemptsLeft <= 0}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black uppercase text-xs sm:text-sm rounded-xl border border-red-300 shadow-[0_0_15px_rgba(239,68,68,0.5)] transition-all font-mono shrink-0"
                      >
                        💥 LAUNCH GUESS (INSTANT WIN)
                      </button>
                    </div>
                    {gameState.imposterGuesses?.length > 0 && (
                      <p className="text-[11px] font-mono text-red-400 mt-2">
                        ❌ Failed Attempts: {gameState.imposterGuesses.join(', ')}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs font-mono text-gray-400">
                    📡 The hidden Imposter can attempt to guess the secret word at any second. If they guess right, they win immediately!
                  </p>
                )}
              </div>
            )}

            {/* 3. AGENT DOSSIER CARDS & CLUE GRID */}
            <div className="bg-[#0b1120] border-2 border-cyan-900/60 rounded-2xl p-4 sm:p-5 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/40 pb-3 mb-4">
                <h3 className="text-sm sm:text-base font-black uppercase text-cyan-300 font-mono flex items-center gap-2">
                  <span>📂 AGENT DOSSIERS & CLUE LOGS</span>
                </h3>
                {gameState.roundPhase === 'clue_phase' && (
                  <span className="text-xs font-mono font-bold bg-cyan-950 text-cyan-300 border border-cyan-500 px-3 py-1 rounded-full animate-pulse">
                    CURRENT TRANSMITTER: {room.players.find(p => p.id === gameState.clueOrder[gameState.currentClueIndex])?.name || 'Agent'}
                  </span>
                )}
              </div>

              {/* DOSSIER CARDS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {room.players.map((player) => {
                  const isMe = player.id === myPlayerId;
                  const isTurn = gameState.roundPhase === 'clue_phase' && gameState.clueOrder[gameState.currentClueIndex] === player.id;
                  const c1 = gameState.round1Clues?.find(x => x.playerId === player.id);
                  const c2 = gameState.round2Clues?.find(x => x.playerId === player.id);
                  const isSelectedForVote = selectedVoteTarget === player.id;
                  const hasVoted = Boolean(gameState.votes?.[myPlayerId]);

                  return (
                    <div
                      key={player.id}
                      onClick={() => {
                        if (gameState.roundPhase === 'voting' && !isMe && !hasVoted) {
                          setSelectedVoteTarget(player.id);
                        }
                      }}
                      className={`border-2 rounded-xl p-3 flex flex-col justify-between transition-all duration-200 ${
                        isSelectedForVote
                          ? 'bg-red-950/80 border-red-500 ring-4 ring-red-500 shadow-[0_0_20px_rgba(239,68,68,0.6)] scale-102'
                          : isTurn
                          ? 'bg-cyan-950/60 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)] scale-102'
                          : 'bg-[#0f172a]/70 border-cyan-900/50 hover:border-cyan-700'
                      } ${gameState.roundPhase === 'voting' && !isMe && !hasVoted ? 'cursor-pointer hover:scale-105' : ''}`}
                    >
                      {/* Player Profile Header */}
                      <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
                        <div className="flex items-center gap-1.5 truncate">
                          <span className="text-base">{player.isBot ? '🤖' : isMe ? '⭐' : '🕵️'}</span>
                          <span className="text-xs font-black uppercase truncate text-white font-mono">
                            {player.name} {isMe && '(You)'}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono font-black bg-black/60 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-900">
                          {gameState.scores?.[player.id] || 0} XP
                        </span>
                      </div>

                      {/* Clues Box */}
                      <div className="space-y-1.5 my-2">
                        <div className="bg-black/40 border border-cyan-950 rounded p-1.5 text-center">
                          <span className="text-[9px] font-mono text-gray-400 block uppercase">ROUND 01 CLUE</span>
                          <span className="text-xs font-black font-mono text-yellow-300 block truncate">
                            {c1 ? `"${c1.clue}"` : '⏳ WAITING...'}
                          </span>
                        </div>
                        <div className="bg-black/40 border border-cyan-950 rounded p-1.5 text-center">
                          <span className="text-[9px] font-mono text-gray-400 block uppercase">ROUND 02 CLUE</span>
                          <span className="text-xs font-black font-mono text-cyan-300 block truncate">
                            {c2 ? `"${c2.clue}"` : '⏳ WAITING...'}
                          </span>
                        </div>
                      </div>

                      {/* Turn / Vote Status */}
                      {isTurn && (
                        <div className="text-center bg-cyan-900/50 border border-cyan-500/60 rounded py-1 text-[10px] font-mono font-black text-cyan-300 animate-pulse">
                          📡 TRANSMITTING CLUE...
                        </div>
                      )}
                      {gameState.roundPhase === 'voting' && !isMe && (
                        <button
                          type="button"
                          className={`w-full py-1 text-[10px] font-mono font-black uppercase rounded mt-1 border transition-all ${
                            isSelectedForVote
                              ? 'bg-red-500 text-white border-red-300'
                              : 'bg-cyan-950 text-cyan-300 border-cyan-800 hover:bg-red-950'
                          }`}
                        >
                          {isSelectedForVote ? '🎯 SELECTED SUSPECT' : '👉 ACCUSE AGENT'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ACTIVE PLAYER 1-WORD CLUE INPUT */}
              {isMyClueTurn && (
                <div className="mt-4 bg-gradient-to-r from-cyan-950 via-slate-900 to-cyan-950 border-2 border-cyan-400 rounded-xl p-4 shadow-[0_0_20px_rgba(34,211,238,0.3)] animate-pulse">
                  <label className="block text-xs font-mono font-black uppercase text-cyan-300 mb-2">
                    💡 YOUR TRANSMISSION TURN: ENTER 1-WORD CLUE (ROUND {gameState.clueRound}):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. CRUNCHY, HOT, YELLOW..."
                      value={clueInput}
                      onChange={(e) => setClueInput(e.target.value.split(' ')[0])}
                      maxLength={25}
                      className="flex-1 bg-black/80 border-2 border-cyan-400 rounded-xl px-4 py-2 text-base font-black font-mono text-white placeholder-cyan-800 uppercase focus:outline-none focus:ring-2 focus:ring-cyan-300"
                    />
                    <button
                      onClick={() => clueInput.trim() && handleAction('submit_clue', { clue: clueInput.trim() })}
                      disabled={!clueInput.trim() || actionLoading}
                      className="px-6 py-2 bg-cyan-400 hover:bg-cyan-300 text-black font-black uppercase text-xs sm:text-sm rounded-xl border border-black shadow-[0_0_15px_rgba(34,211,238,0.6)] font-mono"
                    >
                      TRANSMIT CLUE 📡
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. VOTING LOCK IN BUTTON */}
            {gameState.roundPhase === 'voting' && (
              <div className="bg-[#1e1026] border-2 border-purple-500 rounded-2xl p-4 sm:p-5 shadow-[0_0_20px_rgba(168,85,247,0.3)] text-center">
                <h3 className="text-base sm:text-lg font-black uppercase text-purple-300 font-mono mb-1">
                  🗳️ HIGH TRIBUNAL: CAST YOUR VOTE FOR THE IMPOSTER!
                </h3>
                <p className="text-xs font-mono text-gray-300 mb-4">
                  Tap an Agent's dossier above to accuse them. If the majority votes for the Imposter, they lose!
                </p>

                {!gameState.votes?.[myPlayerId] ? (
                  <button
                    onClick={() => selectedVoteTarget && handleAction('cast_vote', { targetPlayerId: selectedVoteTarget })}
                    disabled={!selectedVoteTarget || actionLoading}
                    className="px-8 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black uppercase text-xs sm:text-sm rounded-xl border-2 border-red-300 shadow-[0_0_20px_rgba(239,68,68,0.6)] font-mono transition-transform hover:scale-105"
                  >
                    🔒 LOCK VERDICT: {room.players.find(p => p.id === selectedVoteTarget)?.name || 'SELECT AGENT ABOVE'}
                  </button>
                ) : (
                  <div className="text-xs font-mono font-black text-emerald-300 bg-emerald-950/80 border border-emerald-500 rounded-xl py-2 px-4 inline-block">
                    ✅ YOUR ACCUSATION IS LOCKED! Awaiting remaining tribunal members ({Object.keys(gameState.votes || {}).length}/{room.players.length})
                  </div>
                )}
              </div>
            )}

            {/* 5. GRAND UNMASKING & MISSION DEBRIEF SCREEN */}
            {gameState.roundPhase === 'game_over' && (
              <div className="bg-gradient-to-br from-[#0b1329] via-[#0f172a] to-[#040817] border-4 border-cyan-400 rounded-2xl p-6 sm:p-8 shadow-[0_0_35px_rgba(34,211,238,0.4)] text-center">
                <span className="text-5xl sm:text-6xl block mb-2">
                  {gameState.winnerTeam === 'detectives' ? "🏆🕵️‍♂️" : "😱🎭"}
                </span>

                <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-widest font-mono mb-2 text-white">
                  {gameState.winnerTeam === 'detectives'
                    ? "🎉 DETECTIVES CRACKED THE CASE!"
                    : "🎭 THE IMPOSTER FOOLED EVERYONE!"}
                </h2>

                {/* THE UNMASKED IMPOSTER REVEAL CARD */}
                <div className="my-6 max-w-md mx-auto bg-black/60 border-2 border-red-500 rounded-2xl p-4 shadow-[0_0_25px_rgba(239,68,68,0.5)]">
                  <span className="text-[10px] font-mono font-black uppercase tracking-widest text-red-400 block mb-1">
                    TOP SECRET DOSSIER DECLASSIFIED
                  </span>
                  <div className="text-2xl sm:text-3xl font-black text-red-400 uppercase font-mono mb-2">
                    🎭 IMPOSTER: <span className="text-white underline">{imposterPlayer?.name || 'Undercover Infiltrator'}</span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-emerald-400 uppercase font-mono">
                    🎯 SECRET WORD: <span className="text-yellow-300">{gameState.secretWord}</span>
                  </div>
                </div>

                {isHost && (
                  <button
                    onClick={handleStart}
                    className="px-8 py-3.5 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black uppercase text-xs sm:text-sm rounded-xl border-2 border-black shadow-[0_0_20px_rgba(250,204,21,0.6)] font-mono transition-transform hover:scale-105"
                  >
                    🔄 LAUNCH NEXT OPERATION (NEW ROUND)
                  </button>
                )}
              </div>
            )}

          </div>

          {/* SIDEBAR: ENCRYPTED AGENCY COMM CHAT */}
          <div className={`w-full lg:w-80 shrink-0 ${showChatDrawer ? 'block' : 'hidden lg:block'}`}>
            <ChatPanel messages={room.chat ?? []} onSend={handleChat} disabled={false} />
          </div>

        </div>
      )}
    </div>
  );
}
