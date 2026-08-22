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

  useEffect(() => {
    if (gameState?.roundPhase === 'game_over') {
      confetti({ particleCount: 60, spread: 80, origin: { y: 0.6 } });
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
    <div className="w-full max-w-[1500px] mx-auto px-3 sm:px-6 py-4 font-sans">
      {/* HEADER BAR */}
      <div className="bg-[#fecdd3] border-[4px] border-black rounded-xl p-4 sm:p-5 shadow-[6px_6px_0px_#000] mb-6 flex flex-wrap items-center justify-between gap-4 -rotate-0.5">
        <div className="flex items-center gap-3">
          <span className="text-3xl sm:text-4xl">🕵️‍♂️🎭</span>
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-black">
              Word Imposter
            </h1>
            <p className="text-xs font-black uppercase text-gray-700">
              Room: <span className="text-black bg-white px-2 py-0.5 border border-black rounded">{room.code}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <VoiceChat roomCode={room.code} />
          {gameState && (
            <div className="bg-white border-[3px] border-black px-4 py-1.5 rounded-lg shadow-[3px_3px_0px_#000] text-center font-black">
              <span className="text-[10px] text-gray-500 uppercase block">Clue Round</span>
              <span className="text-lg text-black">
                {gameState.roundPhase === 'voting' ? '🗳️ Voting' : `${gameState.clueRound} / ${gameState.totalClueRounds}`}
              </span>
            </div>
          )}
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

            {/* 1. HERO IDENTITY CARD */}
            <div className="bg-white border-[4px] border-black rounded-xl p-5 sm:p-6 shadow-[6px_6px_0px_#000] text-center rotate-0.5">
              <span className="text-xs font-black uppercase text-gray-700 bg-yellow-200 px-3 py-1 rounded-full border border-black inline-block mb-3">
                Category: {gameState.category}
              </span>

              {isImposter ? (
                <div className="bg-red-50 border-[3px] border-red-500 p-4 rounded-xl">
                  <span className="text-4xl block mb-1">🎭🤫</span>
                  <h2 className="text-2xl font-black text-red-600 uppercase tracking-wider mb-1">
                    YOU ARE THE IMPOSTER!
                  </h2>
                  <p className="text-sm font-bold text-gray-700">
                    You only know the category: <strong className="text-black">{gameState.category}</strong>. You have 3 attempts to guess the secret word anytime!
                  </p>
                </div>
              ) : (
                <div className="bg-emerald-50 border-[3px] border-emerald-500 p-4 rounded-xl">
                  <span className="text-4xl block mb-1">🔎🎯</span>
                  <p className="text-xs font-black uppercase text-gray-500">Secret Word</p>
                  <h2 className="text-3xl sm:text-4xl font-black text-emerald-700 uppercase tracking-wider my-1">
                    {gameState.secretWord}
                  </h2>
                  <p className="text-xs sm:text-sm font-bold text-gray-600">
                    Give 2 rounds of smart 1-word clues without making it too obvious!
                  </p>
                </div>
              )}

              {/* ACTION CALLOUT FOR WORD REVEAL */}
              {gameState.roundPhase === 'word_reveal' && (
                <div className="mt-4">
                  <button
                    onClick={() => handleAction('start_clues')}
                    disabled={actionLoading}
                    className="px-8 py-3.5 bg-[#facc15] hover:bg-yellow-300 text-black font-black uppercase text-base border-[3px] border-black rounded-xl shadow-[4px_4px_0px_#000] transition-all hover:translate-x-0.5 hover:translate-y-0.5"
                  >
                    🚀 Start 2 Rounds of 1-Word Clues!
                  </button>
                </div>
              )}
            </div>

            {/* 2. PARALLEL IMPOSTER ANYTIME 3-GUESS PANEL */}
            {gameState.roundPhase !== 'game_over' && (
              <div className="bg-amber-50 border-[4px] border-black rounded-xl p-4 sm:p-5 shadow-[6px_6px_0px_#000]">
                <div className="flex items-center justify-between border-b-2 border-black/20 pb-2 mb-3">
                  <span className="font-black text-sm uppercase text-amber-900 flex items-center gap-1.5">
                    <span>⚡ Imposter Secret Word Steal:</span>
                    <span className="bg-amber-200 border border-black px-2 py-0.5 rounded text-xs">
                      {gameState.imposterAttemptsLeft} / 3 Attempts Left
                    </span>
                  </span>
                  {gameState.imposterGuesses?.length > 0 && (
                    <span className="text-xs text-red-600 font-bold">
                      Failed guesses: {gameState.imposterGuesses.join(', ')}
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
                      className="sketch-button bg-red-400 hover:bg-red-500 text-white font-black uppercase px-6 py-2 text-sm shrink-0"
                    >
                      🎯 Guess Word to Win!
                    </button>
                  </div>
                ) : (
                  <p className="text-xs font-bold text-gray-600">
                    The Imposter can guess the secret word at any second. If they guess right, they win immediately!
                  </p>
                )}
              </div>
            )}

            {/* 3. 2 ROUNDS OF 1-WORD CLUES */}
            {gameState.roundPhase === 'clue_phase' && (
              <div className="bg-white border-[4px] border-black rounded-xl p-5 shadow-[6px_6px_0px_#000]">
                <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-2">
                  <h3 className="text-base sm:text-lg font-black uppercase text-black">
                    💬 Clues - Round {gameState.clueRound} of 2
                  </h3>
                  <span className="text-xs font-black uppercase bg-blue-100 text-blue-800 px-3 py-1 rounded border border-blue-300 animate-pulse">
                    Turn: {room.players.find(p => p.id === gameState.clueOrder[gameState.currentClueIndex])?.name || 'Player'}
                  </span>
                </div>

                {/* Round 1 Clues */}
                <div className="mb-4">
                  <h4 className="text-xs font-black uppercase text-gray-500 mb-2">Round 1 Clues:</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                    {room.players.map((p) => {
                      const c = gameState.round1Clues?.find(x => x.playerId === p.id);
                      return (
                        <div key={p.id} className="bg-gray-50 border-[2px] border-black rounded-lg p-2 text-center">
                          <span className="text-xs font-bold text-gray-600 block truncate">{p.name}</span>
                          <span className="text-sm font-black text-black">{c ? `"${c.clue}"` : '⏳ Waiting...'}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Round 2 Clues */}
                {gameState.clueRound === 2 && (
                  <div className="mb-4 pt-2 border-t border-black/10">
                    <h4 className="text-xs font-black uppercase text-gray-500 mb-2">Round 2 Clues:</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                      {room.players.map((p) => {
                        const c = gameState.round2Clues?.find(x => x.playerId === p.id);
                        return (
                          <div key={p.id} className="bg-gray-50 border-[2px] border-black rounded-lg p-2 text-center">
                            <span className="text-xs font-bold text-gray-600 block truncate">{p.name}</span>
                            <span className="text-sm font-black text-black">{c ? `"${c.clue}"` : '⏳ Waiting...'}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Active Player Input */}
                {isMyClueTurn && (
                  <div className="bg-yellow-50 border-[3px] border-black p-4 rounded-xl mt-4">
                    <label className="block text-sm font-black uppercase text-black mb-2">
                      💡 Your Turn: Enter 1-Word Clue (Round {gameState.clueRound}):
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="e.g. Yellow, Crunchy, Hot..."
                        value={clueInput}
                        onChange={(e) => setClueInput(e.target.value.split(' ')[0])}
                        maxLength={25}
                        className="input-field flex-1 font-black uppercase text-lg"
                      />
                      <button
                        onClick={() => clueInput.trim() && handleAction('submit_clue', { clue: clueInput.trim() })}
                        disabled={!clueInput.trim() || actionLoading}
                        className="sketch-button bg-green-400 px-6 py-2 uppercase font-black"
                      >
                        Submit Clue
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. VOTING PHASE */}
            {gameState.roundPhase === 'voting' && (
              <div className="bg-white border-[4px] border-black rounded-xl p-5 shadow-[6px_6px_0px_#000]">
                <h3 className="text-xl font-black uppercase text-black mb-2 text-center">
                  🗳️ Vote for the Imposter!
                </h3>
                <p className="text-xs font-bold text-gray-600 mb-4 text-center">
                  Both clue rounds are complete! Tap who you suspect. If majority votes for the Imposter, they lose!
                </p>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
                  {room.players.map((p) => {
                    const isMe = p.id === myPlayerId;
                    const isSelected = selectedVoteTarget === p.id;
                    const hasVoted = Boolean(gameState.votes?.[myPlayerId]);

                    return (
                      <button
                        key={p.id}
                        disabled={isMe || hasVoted}
                        onClick={() => setSelectedVoteTarget(p.id)}
                        className={`border-[3px] border-black rounded-xl p-4 text-center transition-all ${
                          isMe ? 'opacity-50 cursor-not-allowed bg-gray-100' : 'cursor-pointer hover:-translate-y-1'
                        } ${isSelected ? 'bg-red-100 ring-4 ring-red-500 shadow-[4px_4px_0px_#000]' : 'bg-white'}`}
                      >
                        <span className="text-3xl block mb-1">🎭</span>
                        <span className="text-sm font-black uppercase text-black block truncate">{p.name}</span>
                        {isMe && <span className="text-[10px] font-bold text-gray-500">(You)</span>}
                      </button>
                    );
                  })}
                </div>

                {!gameState.votes?.[myPlayerId] ? (
                  <div className="text-center">
                    <button
                      onClick={() => selectedVoteTarget && handleAction('cast_vote', { targetPlayerId: selectedVoteTarget })}
                      disabled={!selectedVoteTarget || actionLoading}
                      className="px-8 py-3 bg-red-500 disabled:bg-gray-400 text-white font-black uppercase rounded-xl border-[3px] border-black shadow-[4px_4px_0px_#000]"
                    >
                      🔒 Lock Vote: {room.players.find(p => p.id === selectedVoteTarget)?.name || 'Select Player'}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-2 text-sm font-black text-green-700 bg-green-100 border-[2px] border-green-500 rounded-lg">
                    ✅ Your vote is locked! Waiting for other players... ({Object.keys(gameState.votes || {}).length}/{room.players.length})
                  </div>
                )}
              </div>
            )}

            {/* 5. GAME OVER RESULT */}
            {gameState.roundPhase === 'game_over' && (
              <div className="bg-white border-[4px] border-black rounded-xl p-6 shadow-[6px_6px_0px_#000] text-center rotate-0.5">
                <span className="text-5xl block mb-2">
                  {gameState.winnerTeam === 'detectives' ? "🎉🕵️‍♂️" : "😱🎭"}
                </span>
                <h2 className="text-3xl font-black uppercase tracking-wider text-black mb-2">
                  {gameState.winnerTeam === 'detectives' ? "DETECTIVES WIN!" : "IMPOSTER WINS!"}
                </h2>
                <p className="text-sm font-bold text-gray-700 mb-4">
                  The Secret Word was: <strong className="text-emerald-700 uppercase text-lg">{gameState.secretWord}</strong> | Imposter was: <strong className="text-red-600 uppercase text-lg">{room.players.find(p => p.id === gameState.imposterId)?.name}</strong>
                </p>

                {isHost && (
                  <button
                    onClick={handleStart}
                    className="px-8 py-3.5 bg-[#facc15] hover:bg-yellow-300 text-black font-black uppercase text-base border-[3px] border-black rounded-xl shadow-[4px_4px_0px_#000] transition-all"
                  >
                    🔄 Play Another Game
                  </button>
                )}
              </div>
            )}

            {/* LIVE SCOREBOARD */}
            <div className="bg-white border-[4px] border-black rounded-xl p-4 sm:p-5 shadow-[6px_6px_0px_#000]">
              <h3 className="text-base font-black uppercase tracking-wider text-black mb-3 border-b-2 border-black pb-2 flex items-center gap-2">
                <span>🏆 Cumulative Leaderboard</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {room.players.map((p) => (
                  <div key={p.id} className="bg-gray-50 border-[2px] border-black rounded-lg p-3 text-center">
                    <span className="text-xs font-bold text-gray-600 block truncate">{p.name}</span>
                    <span className="text-xl font-black text-black">{gameState.scores?.[p.id] || 0} pts</span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT/BOTTOM: LIVE CHAT */}
          <div className="w-full lg:w-80 shrink-0">
            <ChatPanel messages={room.chat ?? []} onSend={handleChat} disabled={false} />
          </div>
        </div>
      )}
    </div>
  );
}
