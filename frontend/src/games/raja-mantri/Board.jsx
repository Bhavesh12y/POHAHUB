import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby.jsx';
import VoiceChat from '../../components/VoiceChat.jsx';
import ChatPanel from '../../components/ChatPanel.jsx';
import RoleCard, { ROLES_DATA } from './RoleCard.jsx';
import confetti from 'canvas-confetti';

export default function RajaMantriBoard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState(null);
  const [selectedSuspect, setSelectedSuspect] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');


  useEffect(() => {
    const socket = connectSocket();
    const username = localStorage.getItem('pohahub_username') || sessionStorage.getItem('pohahub_username');
    if (!username) {
      navigate(`/games/raja-mantri?join=${roomCode}`);
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
  const myRole = gameState?.roundRoles?.[myPlayerId];

  // Trigger confetti on final winner or perfect Mantri guess
  useEffect(() => {
    if (gameState?.roundPhase === 'round_result' && gameState?.isGuessCorrect) {
      confetti({ particleCount: 40, spread: 60, origin: { y: 0.6 } });
    }
    if (gameState?.status === 'finished') {
      confetti({ particleCount: 100, spread: 90, origin: { y: 0.5 } });
    }
  }, [gameState?.roundPhase, gameState?.status, gameState?.isGuessCorrect]);

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
    else setError('');
  };

  const handleChat = (message) => emitWithAck('chat:message', { message });

  if (!room) {
    return (
      <div className="text-center py-24 text-black font-black uppercase tracking-widest text-xl animate-pulse">
        Connecting to Palace...
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1500px] mx-auto px-3 sm:px-6 py-4 font-sans">
      {/* HEADER BAR */}
      <div className="bg-[#fef08a] border-[4px] border-black rounded-xl p-4 sm:p-5 shadow-[6px_6px_0px_#000] mb-6 flex flex-wrap items-center justify-between gap-4 -rotate-0.5">
        <div className="flex items-center gap-3">
          <span className="text-3xl sm:text-4xl">👑</span>
          <div>
            <h1 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-black">
              Raja Mantri Chor Sipahi
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
              <span className="text-xs text-gray-500 uppercase block">Round</span>
              <span className="text-lg text-black">{gameState.currentRound} / {gameState.totalRounds}</span>
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
          gamePath="raja-mantri/room"
        />
      ) : (
        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* MAIN GAME AREA */}
          <div className="flex-1 w-full flex flex-col gap-6">
            
            {/* ROUND STATUS BANNER */}
            <div className="bg-white border-[4px] border-black rounded-xl p-4 sm:p-6 shadow-[6px_6px_0px_#000] text-center rotate-0.5">
              {gameState.roundPhase === 'revealing' && (
                <div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase text-black mb-1">
                    📜 Secret Chits Distributed!
                  </h2>
                  <p className="text-sm font-bold text-gray-700">
                    {myRole === 'RAJA' ? "👑 You are the King! Call for your Minister below." : "Tap your chit below to privately see your role."}
                  </p>
                  {myRole === 'RAJA' && (
                    <button
                      onClick={() => handleAction('raja_call')}
                      disabled={actionLoading}
                      className="mt-4 px-6 py-3 bg-[#facc15] hover:bg-yellow-300 text-black font-black uppercase text-base border-[3px] border-black rounded-lg shadow-[4px_4px_0px_#000] transition-all hover:translate-x-0.5 hover:translate-y-0.5"
                    >
                      👑 Mera Mantri Kaun? (Call Minister)
                    </button>
                  )}
                </div>
              )}

              {gameState.roundPhase === 'mantri_call' && (
                <div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase text-black mb-1">
                    👑 The Raja Asks: "Mera Mantri Kaun?"
                  </h2>
                  <p className="text-sm font-bold text-gray-700">
                    {myRole === 'MANTRI' ? "📜 Step forward and claim your post, Minister!" : "Waiting for the Minister to identify themselves..."}
                  </p>
                  {myRole === 'MANTRI' && (
                    <button
                      onClick={() => handleAction('mantri_reveal')}
                      disabled={actionLoading}
                      className="mt-4 px-6 py-3 bg-[#38bdf8] hover:bg-sky-300 text-black font-black uppercase text-base border-[3px] border-black rounded-lg shadow-[4px_4px_0px_#000] transition-all hover:translate-x-0.5 hover:translate-y-0.5"
                    >
                      📜 Main Hoon Mantri! (Identify Yourself)
                    </button>
                  )}
                </div>
              )}

              {gameState.roundPhase === 'mantri_guess' && (
                <div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase text-black mb-1">
                    🔍 Mantri Interrogation Phase!
                  </h2>
                  <p className="text-sm font-bold text-gray-700">
                    {myRole === 'MANTRI' ? "Select who you suspect is the CHOR (Thief) from the suspects below!" : "The Minister is inspecting the suspects. Stay calm!"}
                  </p>
                </div>
              )}

              {gameState.roundPhase === 'round_result' && (
                <div>
                  <div className="text-4xl mb-2">
                    {gameState.isGuessCorrect ? "🎉🎯" : "😱🦹"}
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wider text-black mb-2">
                    {gameState.isGuessCorrect ? "Sahi Pakde Hain! Mantri Caught the Chor!" : "Chor Bhaag Gaya! The Thief Escaped!"}
                  </h2>
                  <p className="text-sm font-bold text-gray-700 mb-4">
                    {gameState.isGuessCorrect 
                      ? "The Minister correctly identified the Thief and secured 800 points!" 
                      : "The Minister accused the loyal Soldier! The Thief stole the Minister's 800 points!"}
                  </p>

                  {gameState.status === 'playing' && (
                    <button
                      onClick={() => handleAction('next_round')}
                      disabled={actionLoading}
                      className="px-8 py-3.5 bg-[#4ade80] hover:bg-green-300 text-black font-black uppercase text-base border-[3px] border-black rounded-xl shadow-[4px_4px_0px_#000] transition-all hover:translate-x-0.5 hover:translate-y-0.5"
                    >
                      Next Round ({gameState.currentRound + 1}/{gameState.totalRounds}) ➡️
                    </button>
                  )}
                </div>
              )}

              {gameState.status === 'finished' && (
                <div className="py-4">
                  <span className="text-5xl block mb-2">🏆👑</span>
                  <h2 className="text-3xl font-black uppercase text-black mb-2">Game Over!</h2>
                  <p className="text-lg font-black text-green-700 mb-4">
                    Winner: {room.players.find(p => p.id === gameState.winner)?.name || 'Champion'}!
                  </p>
                  {isHost && (
                    <button
                      onClick={handleStart}
                      className="px-8 py-3.5 bg-[#facc15] hover:bg-yellow-300 text-black font-black uppercase text-base border-[3px] border-black rounded-xl shadow-[4px_4px_0px_#000] transition-all"
                    >
                      🔄 Play Rematch (5 Rounds)
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* 4 PLAYERS' CHITS & SUSPECT CARDS GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {room.players.map((player) => {
                const isMe = player.id === myPlayerId;
                const roleKey = gameState.roundRoles?.[player.id];
                const isRoleRevealed = Boolean(roleKey);
                const isMantriGuessing = gameState.roundPhase === 'mantri_guess' && myRole === 'MANTRI' && player.id !== myPlayerId && player.id !== gameState.rajaId;
                const isSelected = selectedSuspect === player.id;
                const pointsThisRound = gameState.roundPoints?.[player.id];

                return (
                  <div
                    key={player.id}
                    onClick={() => {
                      if (isMantriGuessing) setSelectedSuspect(player.id);
                    }}
                    className={`relative border-[4px] border-black rounded-xl p-4 transition-all duration-200 shadow-[6px_6px_0px_#000] ${
                      isSelected ? 'ring-4 ring-red-500 scale-105 bg-red-50' : 'bg-white'
                    } ${isMantriGuessing ? 'cursor-pointer hover:border-red-600 hover:-translate-y-1' : ''}`}
                  >
                    {/* Player Badge */}
                    <div className="flex justify-between items-center mb-3 border-b-2 border-black/20 pb-2">
                      <span className="font-black text-sm uppercase truncate text-black flex items-center gap-1.5">
                        {player.name} {isMe && '(You)'}
                      </span>
                      <span className="bg-black text-white text-xs font-black px-2 py-0.5 rounded">
                        {gameState.scores?.[player.id] || 0} pts
                      </span>
                    </div>

                    {/* Chit / Role Card */}
                    <div className="h-[180px]">
                      <RoleCard roleKey={roleKey} isRevealed={isRoleRevealed} />
                    </div>

                    {pointsThisRound !== undefined && (
                      <div className="mt-2 text-center">
                        <span className={`text-xs font-black px-2.5 py-1 rounded-full border border-black inline-block ${pointsThisRound > 0 ? 'bg-green-300 text-black' : 'bg-red-300 text-black'}`}>
                          Round: +{pointsThisRound} pts
                        </span>
                      </div>
                    )}

                    {/* Suspect Selector Pill */}
                    {isMantriGuessing && (
                      <div className="mt-3 text-center">
                        <button
                          type="button"
                          className={`w-full py-1.5 text-xs font-black uppercase rounded border-[2px] border-black transition-all ${
                            isSelected ? 'bg-red-500 text-white' : 'bg-yellow-300 text-black'
                          }`}
                        >
                          {isSelected ? '🎯 Selected Suspect' : '👉 Suspect as Chor'}
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>


            {/* MANTRI VERDICT LOCK BUTTON */}
            {gameState.roundPhase === 'mantri_guess' && myRole === 'MANTRI' && (
              <div className="bg-red-100 border-[4px] border-black rounded-xl p-4 text-center shadow-[6px_6px_0px_#000]">
                <h3 className="text-lg font-black uppercase text-black mb-2">Lock In Your Verdict</h3>
                <button
                  onClick={() => selectedSuspect && handleAction('mantri_guess', { suspectId: selectedSuspect })}
                  disabled={!selectedSuspect || actionLoading}
                  className="px-8 py-3 bg-red-500 disabled:bg-gray-400 text-white font-black uppercase tracking-wider rounded-xl border-[3px] border-black shadow-[4px_4px_0px_#000] text-base transition-all hover:translate-x-0.5 hover:translate-y-0.5"
                >
                  🔒 Lock Accusation: {room.players.find(p => p.id === selectedSuspect)?.name || 'Select a Suspect'} is Chor!
                </button>
              </div>
            )}

            {/* LIVE SCOREBOARD */}
            <div className="bg-white border-[4px] border-black rounded-xl p-4 sm:p-5 shadow-[6px_6px_0px_#000]">
              <h3 className="text-base sm:text-lg font-black uppercase tracking-wider text-black mb-3 border-b-2 border-black pb-2 flex items-center gap-2">
                <span>🏆 Cumulative Leaderboard (5 Rounds)</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {room.players.map((p, idx) => (
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
