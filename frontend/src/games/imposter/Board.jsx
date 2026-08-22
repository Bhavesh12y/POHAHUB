import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby.jsx';
import VoiceChat from '../../components/VoiceChat.jsx';
import ChatPanel from '../../components/ChatPanel.jsx';
import confetti from 'canvas-confetti';

const CARD_COLORS = ['bg-[#fef08a]', 'bg-[#bae6fd]', 'bg-[#bbf7d0]', 'bg-[#fed7aa]', 'bg-[#fbcfe8]', 'bg-[#e9d5ff]'];

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
      confetti({ particleCount: 70, spread: 80, origin: { y: 0.6 } });
    }
  }, [gameState?.roundPhase]);

  const handleStart = async () => {
    setActionLoading(true);
    const res = await emitWithAck('room:start', {});
    setActionLoading(false);
    if (!res.ok) setError(res.error || 'Failed to start game');
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
      <div className="text-center py-24 text-black font-black uppercase tracking-widest text-xl animate-pulse">
        Connecting to Secret Agency...
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1500px] mx-auto px-3 sm:px-6 py-4 font-sans select-none">
      
      {/* HEADER BAR (DOOZLES SIGNATURE NOTEBOOK STYLE) */}
      <div className="bg-[#fecdd3] border-[4px] border-black rounded-xl p-4 sm:p-5 shadow-[6px_6px_0px_#000] mb-6 flex flex-wrap items-center justify-between gap-4 -rotate-0.5">
        <div className="flex items-center gap-3">
          <span className="text-3xl sm:text-4xl">🕵️‍♂️🎭</span>
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-black">
              Word Imposter
            </h1>
            <p className="text-xs font-black uppercase text-gray-700">
              Room: <span className="text-black bg-white px-2 py-0.5 border-2 border-black rounded">{room.code}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <VoiceChat roomCode={room.code} />
          {gameState && (
            <div className="bg-white border-[3px] border-black px-4 py-1.5 rounded-lg shadow-[3px_3px_0px_#000] text-center font-black">
              <span className="text-[10px] text-gray-500 uppercase block">Clue Round</span>
              <span className="text-sm sm:text-base text-black">
                {gameState.roundPhase === 'voting' ? '🗳️ Voting' : gameState.roundPhase === 'game_over' ? '🏁 Finished' : `${gameState.clueRound} / ${gameState.totalClueRounds}`}
              </span>
            </div>
          )}
          <button
            onClick={() => setShowChatDrawer(!showChatDrawer)}
            className="lg:hidden bg-white border-[2px] border-black px-2.5 py-1 rounded text-xs font-black uppercase"
          >
            💬 Chat
          </button>
        </div>
      </div>

      {/* LOBBY OR ACTIVE GAME */}
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
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* MAIN GAME AREA */}
          <div className="flex-1 w-full flex flex-col gap-6">

            {/* 1. HERO IDENTITY CARD (NOTEBOOK POSTER STYLE) */}
            <div className="bg-white border-[4px] border-black rounded-2xl p-5 sm:p-6 shadow-[8px_8px_0px_#000] text-center rotate-0.5 relative overflow-hidden">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 border-b-2 border-black/20 pb-2">
                <span className="text-xs font-black uppercase text-gray-800 bg-yellow-200 px-3 py-1 rounded-full border-2 border-black">
                  Category: <strong className="text-black">{gameState.category}</strong>
                </span>
                <span className="text-[11px] font-black uppercase bg-gray-100 px-2 py-0.5 rounded border border-black text-gray-700">
                  {gameState.roundPhase === 'word_reveal' ? 'Step 1: Role Briefing' : 'Step 2: 2 Clue Rounds'}
                </span>
              </div>

              {isImposter ? (
                /* IMPOSTER VIEW */
                <div className="bg-red-50 border-[3px] border-red-500 p-4 sm:p-5 rounded-xl my-2">
                  <span className="text-4xl sm:text-5xl block mb-1">🎭🤫</span>
                  <h2 className="text-2xl sm:text-3xl font-black text-red-600 uppercase tracking-wider mb-1">
                    YOU ARE THE IMPOSTER!
                  </h2>
                  <p className="text-xs sm:text-sm font-bold text-gray-700 max-w-lg mx-auto">
                    You only know the category <strong className="text-black font-black">"{gameState.category}"</strong>. Give sneaky 1-word clues to blend in, or use your 3 attempts to guess the secret word!
                  </p>
                </div>
              ) : (
                /* DETECTIVE VIEW */
                <div className="bg-emerald-50 border-[3px] border-emerald-500 p-4 sm:p-5 rounded-xl my-2">
                  <span className="text-3xl sm:text-4xl block mb-1">🔎🎯</span>
                  <span className="text-xs font-black uppercase text-gray-500 block">Secret Word</span>
                  <h2 className="text-3xl sm:text-4xl font-black text-emerald-700 uppercase tracking-wider my-1">
                    {gameState.secretWord}
                  </h2>
                  <p className="text-xs sm:text-sm font-bold text-gray-600 max-w-lg mx-auto">
                    Give 2 rounds of clever 1-word clues to prove your innocence without giving the word away to the Imposter!
                  </p>
                </div>
              )}

              {/* ACTION BUTTON TO START CLUE ROUNDS */}
              {gameState.roundPhase === 'word_reveal' && (
                <div className="mt-4">
                  <button
                    onClick={() => handleAction('start_clues')}
                    disabled={actionLoading}
                    className="sketch-button bg-[#facc15] hover:bg-yellow-300 text-black font-black uppercase px-8 py-3.5 text-sm sm:text-base transition-all hover:scale-105"
                  >
                    🚀 Start Round 1 of 1-Word Clues!
                  </button>
                </div>
              )}
            </div>

            {/* 2. PARALLEL IMPOSTER 3-GUESS TERMINAL BOX */}
            {gameState.roundPhase !== 'game_over' && (
              <div className="bg-[#fed7aa] border-[4px] border-black rounded-xl p-4 sm:p-5 shadow-[6px_6px_0px_#000] -rotate-0.5">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black/20 pb-2 mb-3">
                  <span className="font-black text-xs sm:text-sm uppercase text-amber-950 flex items-center gap-2">
                    <span>⚡ Imposter Secret Word Steal:</span>
                    <span className="bg-white border-2 border-black px-2 py-0.5 rounded-full text-xs text-black">
                      {gameState.imposterAttemptsLeft ?? 3} / 3 Attempts Left
                    </span>
                  </span>
                  {gameState.imposterGuesses?.length > 0 && (
                    <span className="text-xs text-red-600 font-black">
                      Tried: {gameState.imposterGuesses.join(', ')}
                    </span>
                  )}
                </div>

                {isImposter ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Type your guess anytime..."
                      value={imposterGuessInput}
                      onChange={(e) => setImposterGuessInput(e.target.value)}
                      maxLength={30}
                      className="input-field flex-1 font-black uppercase text-sm"
                    />
                    <button
                      onClick={() => imposterGuessInput.trim() && handleAction('imposter_guess_word', { guess: imposterGuessInput.trim() })}
                      disabled={!imposterGuessInput.trim() || actionLoading || gameState.imposterAttemptsLeft <= 0}
                      className="sketch-button bg-red-400 hover:bg-red-500 text-white font-black uppercase px-6 py-2.5 text-sm shrink-0"
                    >
                      🎯 Guess Word to Win!
                    </button>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-gray-800">
                    The Imposter can guess the secret word at any second. If they guess right, they win immediately!
                  </p>
                )}
              </div>
            )}

            {/* 3. PLAYER CARDS & 2-ROUND CLUE GRID */}
            <div className="bg-white border-[4px] border-black rounded-xl p-4 sm:p-5 shadow-[6px_6px_0px_#000]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-black pb-3 mb-4">
                <h3 className="text-base sm:text-lg font-black uppercase text-black flex items-center gap-2">
                  <span>💬 Clues & Player Suspects (Round {gameState.clueRound} of 2)</span>
                </h3>
                {gameState.roundPhase === 'clue_phase' && (
                  <span className="text-xs font-black uppercase bg-blue-100 text-blue-900 border-2 border-black px-3 py-1 rounded-full animate-pulse">
                    Turn: {room.players.find(p => p.id === gameState.clueOrder[gameState.currentClueIndex])?.name || 'Player'}
                  </span>
                )}
              </div>

              {/* GRID OF PLAYERS */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                {room.players.map((player, idx) => {
                  const isMe = player.id === myPlayerId;
                  const isTurn = gameState.roundPhase === 'clue_phase' && gameState.clueOrder[gameState.currentClueIndex] === player.id;
                  const c1 = gameState.round1Clues?.find(x => x.playerId === player.id);
                  const c2 = gameState.round2Clues?.find(x => x.playerId === player.id);
                  const isSelectedForVote = selectedVoteTarget === player.id;
                  const hasVoted = Boolean(gameState.votes?.[myPlayerId]);
                  const cardBg = CARD_COLORS[idx % CARD_COLORS.length];

                  return (
                    <div
                      key={player.id}
                      onClick={() => {
                        if (gameState.roundPhase === 'voting' && !isMe && !hasVoted) {
                          setSelectedVoteTarget(player.id);
                        }
                      }}
                      className={`border-[3px] border-black rounded-xl p-3 flex flex-col justify-between transition-all shadow-[4px_4px_0px_#000] ${cardBg} ${
                        isSelectedForVote
                          ? 'ring-4 ring-red-500 scale-105 bg-red-100'
                          : isTurn
                          ? 'ring-4 ring-yellow-400 scale-102'
                          : ''
                      } ${gameState.roundPhase === 'voting' && !isMe && !hasVoted ? 'cursor-pointer hover:scale-105' : ''}`}
                    >
                      {/* Top Header */}
                      <div className="flex items-center justify-between border-b-2 border-black/20 pb-2 mb-2">
                        <span className="font-black text-xs sm:text-sm uppercase truncate text-black flex items-center gap-1">
                          <span>{player.isBot ? '🤖' : isMe ? '⭐' : '👤'}</span>
                          <span>{player.name} {isMe && '(You)'}</span>
                        </span>
                        <span className="text-[10px] font-black bg-black text-white px-2 py-0.5 rounded-full">
                          {gameState.scores?.[player.id] || 0} pts
                        </span>
                      </div>

                      {/* Clues Box */}
                      <div className="space-y-1.5 my-2">
                        <div className="bg-white border-2 border-black rounded-lg p-1.5 text-center">
                          <span className="text-[9px] font-black text-gray-500 uppercase block">Round 1 Clue</span>
                          <span className="text-xs sm:text-sm font-black text-black block truncate">
                            {c1 ? `"${c1.clue}"` : '⏳ Waiting...'}
                          </span>
                        </div>
                        <div className="bg-white border-2 border-black rounded-lg p-1.5 text-center">
                          <span className="text-[9px] font-black text-gray-500 uppercase block">Round 2 Clue</span>
                          <span className="text-xs sm:text-sm font-black text-black block truncate">
                            {c2 ? `"${c2.clue}"` : '⏳ Waiting...'}
                          </span>
                        </div>
                      </div>

                      {/* Status / Suspect Button */}
                      {isTurn && (
                        <div className="text-center bg-yellow-300 border-2 border-black rounded py-1 text-[10px] font-black uppercase text-black animate-pulse">
                          👉 Giving Clue...
                        </div>
                      )}
                      {gameState.roundPhase === 'voting' && !isMe && (
                        <button
                          type="button"
                          className={`w-full py-1 text-[10px] font-black uppercase rounded mt-1 border-2 border-black transition-all ${
                            isSelectedForVote
                              ? 'bg-red-500 text-white'
                              : 'bg-white text-black hover:bg-red-200'
                          }`}
                        >
                          {isSelectedForVote ? '🎯 Selected Suspect' : '👉 Suspect as Imposter'}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* ACTIVE TURN INPUT BOX */}
              {isMyClueTurn && (
                <div className="mt-4 bg-yellow-50 border-[3px] border-black p-4 rounded-xl shadow-[4px_4px_0px_#000]">
                  <label className="block text-xs sm:text-sm font-black uppercase text-black mb-2">
                    💡 Your Turn: Enter 1-Word Clue (Round {gameState.clueRound}):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="e.g. Crunchy, Hot, Yellow..."
                      value={clueInput}
                      onChange={(e) => setClueInput(e.target.value.split(' ')[0])}
                      maxLength={25}
                      className="input-field flex-1 font-black uppercase text-base"
                    />
                    <button
                      onClick={() => clueInput.trim() && handleAction('submit_clue', { clue: clueInput.trim() })}
                      disabled={!clueInput.trim() || actionLoading}
                      className="sketch-button bg-green-400 hover:bg-green-300 text-black px-6 py-2 uppercase font-black text-sm"
                    >
                      Submit Clue 🚀
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* 4. VOTING PHASE LOCK IN */}
            {gameState.roundPhase === 'voting' && (
              <div className="bg-white border-[4px] border-black rounded-xl p-5 shadow-[6px_6px_0px_#000] text-center">
                <h3 className="text-lg sm:text-xl font-black uppercase text-black mb-1">
                  🗳️ Vote for the Imposter!
                </h3>
                <p className="text-xs font-bold text-gray-600 mb-4">
                  Both clue rounds are complete! Tap a player card above to select your suspect.
                </p>

                {!gameState.votes?.[myPlayerId] ? (
                  <button
                    onClick={() => selectedVoteTarget && handleAction('cast_vote', { targetPlayerId: selectedVoteTarget })}
                    disabled={!selectedVoteTarget || actionLoading}
                    className="sketch-button bg-red-400 hover:bg-red-500 disabled:opacity-50 text-black font-black uppercase px-8 py-3 text-sm sm:text-base"
                  >
                    🔒 Lock Vote: {room.players.find(p => p.id === selectedVoteTarget)?.name || 'Select Player Above'}
                  </button>
                ) : (
                  <div className="text-xs sm:text-sm font-black text-green-800 bg-green-100 border-2 border-green-500 rounded-lg py-2 px-4 inline-block">
                    ✅ Your vote is locked! Waiting for other players... ({Object.keys(gameState.votes || {}).length}/{room.players.length})
                  </div>
                )}
              </div>
            )}

            {/* 5. GRAND UNMASKING / GAME OVER DEBRIEF */}
            {gameState.roundPhase === 'game_over' && (
              <div className="bg-white border-[4px] border-black rounded-2xl p-6 sm:p-8 shadow-[8px_8px_0px_#000] text-center rotate-0.5">
                <span className="text-5xl sm:text-6xl block mb-2">
                  {gameState.winnerTeam === 'detectives' ? "🏆🕵️‍♂️" : "😱🎭"}
                </span>

                <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-wider text-black mb-2">
                  {gameState.winnerTeam === 'detectives' ? "DETECTIVES WIN!" : "IMPOSTER WINS!"}
                </h2>

                {/* THE UNMASKED IMPOSTER REVEAL CARD */}
                <div className="my-5 max-w-md mx-auto bg-amber-50 border-[3px] border-black rounded-xl p-4 shadow-[4px_4px_0px_#000]">
                  <span className="text-[10px] font-black uppercase tracking-wider text-gray-500 block mb-1">
                    CONFIDENTIAL MISSION REVEAL
                  </span>
                  <div className="text-xl sm:text-2xl font-black text-red-600 uppercase mb-1">
                    🎭 Imposter: <span className="underline text-black">{imposterPlayer?.name || 'Undercover Player'}</span>
                  </div>
                  <div className="text-base sm:text-lg font-black text-emerald-700 uppercase">
                    🎯 Secret Word: <span className="text-black">{gameState.secretWord}</span>
                  </div>
                </div>

                {isHost && (
                  <button
                    onClick={handleStart}
                    className="sketch-button bg-[#facc15] hover:bg-yellow-300 text-black font-black uppercase px-8 py-3.5 text-base shadow-[4px_4px_0px_#000] hover:scale-105 transition-all"
                  >
                    🔄 Play Another Game
                  </button>
                )}
              </div>
            )}

          </div>

          {/* RIGHT / BOTTOM: LIVE CHAT */}
          <div className={`w-full lg:w-80 shrink-0 ${showChatDrawer ? 'block' : 'hidden lg:block'}`}>
            <ChatPanel messages={room.chat ?? []} onSend={handleChat} disabled={false} />
          </div>

        </div>
      )}
    </div>
  );
}
