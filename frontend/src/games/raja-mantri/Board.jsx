import React, { useState, useEffect, useMemo } from 'react';
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
  const [isUnfolded, setIsUnfolded] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');
  const [showChatDrawer, setShowChatDrawer] = useState(false);

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

  // Shuffling animation trigger on new round
  const currentRoundNum = gameState?.currentRound;
  useEffect(() => {
    if (gameState?.roundPhase === 'revealing') {
      setIsShuffling(true);
      setIsUnfolded(false);
      setSelectedSuspect(null);
      const timer = setTimeout(() => {
        setIsShuffling(false);
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, [currentRoundNum, gameState?.roundPhase]);

  // Trigger celebratory confetti on correct guess or overall tournament finish
  useEffect(() => {
    if (gameState?.roundPhase === 'round_result' && gameState?.isGuessCorrect) {
      confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
    }
    if (gameState?.status === 'finished') {
      confetti({ particleCount: 120, spread: 100, origin: { y: 0.5 } });
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

  // -------------------------------------------------------------
  // RELATIVE 4-SIDE SEATING POSITIONING
  // Maps players so current user is ALWAYS at the BOTTOM seat!
  // -------------------------------------------------------------
  const { bottomPlayer, leftPlayer, topPlayer, rightPlayer } = useMemo(() => {
    if (!room?.players || room.players.length === 0) {
      return { bottomPlayer: null, leftPlayer: null, topPlayer: null, rightPlayer: null };
    }
    const myIndex = Math.max(0, room.players.findIndex(p => p.id === myPlayerId));
    return {
      bottomPlayer: room.players[myIndex] || null,
      leftPlayer: room.players[(myIndex + 1) % room.players.length] || null,
      topPlayer: room.players[(myIndex + 2) % room.players.length] || null,
      rightPlayer: room.players[(myIndex + 3) % room.players.length] || null,
    };
  }, [room?.players, myPlayerId]);

  if (!room) {
    return (
      <div className="text-center py-24 text-black font-black uppercase tracking-widest text-xl animate-pulse">
        Connecting to Royal Court...
      </div>
    );
  }

  // Helper to render a player seat
  const renderPlayerSeat = (player, position) => {
    if (!player) return null;
    const isMe = player.id === myPlayerId;
    const roleKey = gameState?.roundRoles?.[player.id];
    
    // Visibility rules:
    // Raja is revealed after calling. Mantri is revealed after identification.
    // In round_result or game_over, everyone's role is revealed.
    const isRolePubliclyRevealed = 
      gameState?.roundPhase === 'round_result' || 
      gameState?.status === 'finished' ||
      (roleKey === 'RAJA' && gameState?.roundPhase !== 'revealing') ||
      (roleKey === 'MANTRI' && (gameState?.roundPhase === 'mantri_guess' || gameState?.roundPhase === 'round_result'));

    const isSuspectCandidate = 
      gameState?.roundPhase === 'mantri_guess' && 
      myRole === 'MANTRI' && 
      !isMe && 
      player.id !== gameState.rajaId && 
      player.id !== gameState.mantriId;

    const isSelectedSuspect = selectedSuspect === player.id;
    const roundPoints = gameState?.roundPoints?.[player.id];
    const totalScore = gameState?.scores?.[player.id] || 0;

    return (
      <div
        onClick={() => {
          if (isSuspectCandidate) setSelectedSuspect(player.id);
        }}
        className={`flex flex-col items-center transition-all duration-300 ${
          isSuspectCandidate ? 'cursor-pointer hover:scale-105' : ''
        }`}
      >
        {/* PLAYER AVATAR & NAME BADGE */}
        <div
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full border-[3px] border-black shadow-[3px_3px_0px_#000] mb-2 ${
            isSelectedSuspect
              ? 'bg-red-500 text-white ring-4 ring-red-400 animate-bounce'
              : isSuspectCandidate
              ? 'bg-amber-300 text-black ring-2 ring-amber-500'
              : isMe
              ? 'bg-yellow-300 text-black'
              : 'bg-white text-black'
          }`}
        >
          <span className="text-base sm:text-lg">
            {player.isBot ? '🤖' : isMe ? '⭐' : '👤'}
          </span>
          <span className="text-xs sm:text-sm font-black uppercase max-w-[90px] sm:max-w-[120px] truncate">
            {player.name} {isMe && '(You)'}
          </span>
          <span className="text-[10px] sm:text-xs font-black bg-black text-white px-1.5 py-0.5 rounded-full">
            {totalScore}
          </span>
        </div>

        {/* CHIT / ROLE BADGE DISPLAY */}
        <div className="relative">
          {isMe ? (
            /* CURRENT USER'S INTERACTIVE CHIT AT BOTTOM */
            <div
              onClick={() => setIsUnfolded(!isUnfolded)}
              className="cursor-pointer select-none transition-transform hover:scale-105 active:scale-95"
            >
              {isUnfolded && roleKey ? (
                <div className="w-40 sm:w-48 h-48 sm:h-56 animate-fadeIn">
                  <RoleCard roleKey={roleKey} isRevealed={true} />
                </div>
              ) : (
                <div className="w-36 sm:w-44 h-28 sm:h-32 bg-amber-50 border-[3px] border-black rounded-xl p-3 shadow-[4px_4px_0px_#000] flex flex-col items-center justify-center text-center relative overflow-hidden group">
                  <div className="w-10 h-10 rounded-full bg-amber-200 border-2 border-black flex items-center justify-center mb-1 group-hover:rotate-12 transition-transform">
                    <span className="text-xl">📜</span>
                  </div>
                  <span className="text-xs font-black uppercase text-amber-950">
                    Your Royal Chit
                  </span>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded mt-1 border border-amber-400">
                    Tap to Peek Role 👁️
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* OTHER 3 OPPONENTS' CHITS (TOP, LEFT, RIGHT) */
            <div className="w-24 sm:w-32 h-32 sm:h-40">
              {isRolePubliclyRevealed && roleKey ? (
                <RoleCard roleKey={roleKey} isRevealed={true} />
              ) : (
                <div
                  className={`w-full h-full bg-[#fed7aa] border-[3px] border-black rounded-xl p-2 shadow-[3px_3px_0px_#000] flex flex-col items-center justify-center text-center ${
                    isSelectedSuspect ? 'ring-4 ring-red-500 bg-red-100' : ''
                  }`}
                >
                  <span className="text-2xl sm:text-3xl mb-1">📜</span>
                  <span className="text-[10px] sm:text-xs font-black uppercase text-amber-950">
                    Secret Chit
                  </span>
                  {isSuspectCandidate && (
                    <span className="text-[9px] sm:text-[10px] font-black uppercase bg-red-500 text-white px-1.5 py-0.5 rounded mt-1 animate-pulse">
                      Suspect
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ROUND POINTS DELTA PILL */}
          {roundPoints !== undefined && (
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap z-10">
              <span
                className={`text-[10px] sm:text-xs font-black px-2 py-0.5 rounded-full border border-black shadow-sm ${
                  roundPoints > 0 ? 'bg-green-300 text-black' : 'bg-red-300 text-black'
                }`}
              >
                +{roundPoints} pts
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1400px] mx-auto px-2 sm:px-4 py-3 font-sans select-none">
      <style>{`
        @keyframes chitSpin {
          0% { transform: scale(0.3) rotate(0deg); opacity: 0; }
          50% { transform: scale(1.1) rotate(180deg); opacity: 1; }
          100% { transform: scale(1) rotate(360deg); opacity: 1; }
        }
        .animate-chit-spin {
          animation: chitSpin 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
      `}</style>

      {/* TOP STATUS BAR */}
      <div className="bg-[#fef08a] border-[3px] sm:border-[4px] border-black rounded-xl p-3 sm:p-4 shadow-[4px_4px_0px_#000] mb-3 sm:mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl sm:text-3xl">👑</span>
          <div>
            <h1 className="text-sm sm:text-lg font-black uppercase tracking-wider text-black leading-tight">
              Raja Mantri Chor Sipahi
            </h1>
            <p className="text-[10px] sm:text-xs font-black text-gray-700 uppercase">
              Room: <span className="bg-white px-1.5 py-0.5 border border-black rounded text-black">{room.code}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <VoiceChat roomCode={room.code} />
          {gameState && (
            <div className="bg-white border-[2px] sm:border-[3px] border-black px-2.5 sm:px-3.5 py-1 rounded-lg shadow-[2px_2px_0px_#000] text-center font-black">
              <span className="text-[9px] sm:text-[10px] text-gray-500 uppercase block">Round</span>
              <span className="text-xs sm:text-sm text-black">{gameState.currentRound} / {gameState.totalRounds}</span>
            </div>
          )}
          <button
            onClick={() => setShowChatDrawer(!showChatDrawer)}
            className="lg:hidden bg-white border-[2px] border-black px-2.5 py-1 rounded text-xs font-black uppercase"
          >
            💬
          </button>
        </div>
      </div>

      {/* LOBBY OR 4-PLAYER ROYAL COURT */}
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
        <div className="flex flex-col lg:flex-row gap-4 items-start">
          {/* MAIN ROYAL MAT / COURT ARENA */}
          <div className="flex-1 w-full bg-[#fefce8] border-[4px] border-black rounded-2xl p-3 sm:p-6 shadow-[8px_8px_0px_#000] relative overflow-hidden flex flex-col justify-between min-h-[580px] sm:min-h-[640px]">
            
            {/* Background Royal Pattern */}
            <div className="absolute inset-0 bg-[radial-gradient(#ca8a04_1px,transparent_1px)] [background-size:16px_16px] opacity-15 pointer-events-none" />

            {/* 1. TOP SEAT: OPPOSITE PLAYER */}
            <div className="w-full flex justify-center z-10">
              {renderPlayerSeat(topPlayer, 'top')}
            </div>

            {/* 2. MIDDLE ROW: LEFT PLAYER | CENTER COURT ROYAL ARENA | RIGHT PLAYER */}
            <div className="w-full flex items-center justify-between gap-2 sm:gap-4 my-auto z-10">
              
              {/* LEFT SEAT */}
              <div className="w-28 sm:w-36 flex justify-start">
                {renderPlayerSeat(leftPlayer, 'left')}
              </div>

              {/* CENTER COURT ARENA & PROMPTS */}
              <div className="flex-1 max-w-sm sm:max-w-md mx-auto bg-white/95 border-[3px] sm:border-[4px] border-black rounded-2xl p-3 sm:p-5 text-center shadow-[6px_6px_0px_#000] relative z-20">
                
                {/* SHUFFLING ANIMATION OVERLAY */}
                {isShuffling ? (
                  <div className="py-6 flex flex-col items-center justify-center animate-chit-spin">
                    <div className="relative w-20 h-20 mb-2">
                      <span className="text-3xl absolute top-0 left-0 animate-bounce">📜</span>
                      <span className="text-3xl absolute top-0 right-0 animate-pulse">👑</span>
                      <span className="text-3xl absolute bottom-0 left-0 animate-pulse">⚔️</span>
                      <span className="text-3xl absolute bottom-0 right-0 animate-bounce">🦹</span>
                    </div>
                    <span className="text-sm font-black uppercase tracking-wider text-amber-900 bg-yellow-200 px-3 py-1 rounded-full border border-black">
                      Shuffling Royal Chits...
                    </span>
                  </div>
                ) : (
                  <div>
                    {/* PHASE 1: RAJA CALL */}
                    {gameState.roundPhase === 'revealing' && (
                      <div>
                        <span className="text-3xl sm:text-4xl block mb-1">👑🏰</span>
                        <h2 className="text-base sm:text-lg font-black uppercase text-black mb-1">
                          Royal Chits Dealt!
                        </h2>
                        <p className="text-xs font-bold text-gray-700 mb-3">
                          Tap your chit below to privately see your role!
                        </p>

                        {myRole === 'RAJA' ? (
                          <button
                            onClick={() => handleAction('raja_call')}
                            disabled={actionLoading}
                            className="w-full py-2.5 sm:py-3 bg-[#facc15] hover:bg-yellow-300 text-black font-black uppercase text-xs sm:text-sm border-[3px] border-black rounded-xl shadow-[3px_3px_0px_#000] transition-all animate-pulse"
                          >
                            👑 Proclaim: "Mera Mantri Kaun?"
                          </button>
                        ) : (
                          <div className="text-xs font-black uppercase text-amber-800 bg-amber-100 p-2 rounded border border-amber-300 animate-pulse">
                            Waiting for Raja to summon the Mantri...
                          </div>
                        )}
                      </div>
                    )}

                    {/* PHASE 2: MANTRI IDENTIFICATION */}
                    {gameState.roundPhase === 'mantri_call' && (
                      <div>
                        <span className="text-3xl sm:text-4xl block mb-1">📜📢</span>
                        <h2 className="text-base sm:text-lg font-black uppercase text-black mb-1">
                          "Mera Mantri Kaun?"
                        </h2>
                        <p className="text-xs font-bold text-gray-700 mb-3">
                          The King has summoned the royal court!
                        </p>

                        {myRole === 'MANTRI' ? (
                          <button
                            onClick={() => handleAction('mantri_reveal')}
                            disabled={actionLoading}
                            className="w-full py-2.5 sm:py-3 bg-[#38bdf8] hover:bg-sky-300 text-black font-black uppercase text-xs sm:text-sm border-[3px] border-black rounded-xl shadow-[3px_3px_0px_#000] transition-all animate-pulse"
                          >
                            📜 Declare: "Main Hoon Sarkar!"
                          </button>
                        ) : (
                          <div className="text-xs font-black uppercase text-sky-800 bg-sky-100 p-2 rounded border border-sky-300 animate-pulse">
                            Waiting for the Mantri to step forward...
                          </div>
                        )}
                      </div>
                    )}

                    {/* PHASE 3: MANTRI GUESS */}
                    {gameState.roundPhase === 'mantri_guess' && (
                      <div>
                        <span className="text-3xl sm:text-4xl block mb-1">🔎⚖️</span>
                        <h2 className="text-base sm:text-lg font-black uppercase text-red-600 mb-1">
                          Catch The Chor!
                        </h2>

                        {myRole === 'MANTRI' ? (
                          <div>
                            <p className="text-xs font-bold text-gray-700 mb-2">
                              Tap the suspected player on the table to accuse them!
                            </p>
                            {selectedSuspect ? (
                              <button
                                onClick={() => handleAction('mantri_guess', { suspectId: selectedSuspect })}
                                disabled={actionLoading}
                                className="w-full py-2.5 sm:py-3 bg-red-500 hover:bg-red-600 text-white font-black uppercase text-xs sm:text-sm border-[3px] border-black rounded-xl shadow-[3px_3px_0px_#000] transition-all animate-bounce"
                              >
                                🎯 Accuse: {room.players.find(p => p.id === selectedSuspect)?.name}!
                              </button>
                            ) : (
                              <div className="text-xs font-black uppercase text-red-700 bg-red-100 p-2 rounded border border-red-300">
                                👈 Tap a suspect chit on the court!
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-xs font-black uppercase text-gray-800 bg-amber-100 p-2 rounded border border-amber-300 animate-pulse">
                            Mantri ({room.players.find(p => p.id === gameState.mantriId)?.name}) is interrogating the suspects...
                          </div>
                        )}
                      </div>
                    )}

                    {/* PHASE 4: ROUND RESULT */}
                    {gameState.roundPhase === 'round_result' && (
                      <div>
                        <span className="text-3xl sm:text-4xl block mb-1">
                          {gameState.isGuessCorrect ? "🎉🎯" : "😱🦹"}
                        </span>
                        <h2 className="text-base sm:text-xl font-black uppercase tracking-wider text-black mb-1">
                          {gameState.isGuessCorrect ? "Mantri Caught The Chor!" : "The Chor Escaped!"}
                        </h2>
                        <p className="text-xs font-bold text-gray-700 mb-3">
                          {gameState.isGuessCorrect 
                            ? "Correct accusation! Mantri keeps +800 pts, Chor gets 0 pts!" 
                            : "Wrong accusation! Chor stole Mantri's 800 pts (+800 to Chor, 0 to Mantri)!"}
                        </p>

                        {gameState.status === 'playing' && (
                          <button
                            onClick={() => handleAction('next_round')}
                            disabled={actionLoading}
                            className="w-full py-2.5 sm:py-3 bg-[#4ade80] hover:bg-green-300 text-black font-black uppercase text-xs sm:text-sm border-[3px] border-black rounded-xl shadow-[3px_3px_0px_#000] transition-all hover:translate-x-0.5 hover:translate-y-0.5"
                          >
                            Next Round ({gameState.currentRound + 1}/{gameState.totalRounds}) ➡️
                          </button>
                        )}
                      </div>
                    )}

                    {/* PHASE 5: GAME OVER */}
                    {gameState.status === 'finished' && (
                      <div className="py-2">
                        <span className="text-4xl block mb-1">🏆👑</span>
                        <h2 className="text-xl font-black uppercase text-black mb-1">Palace Champion!</h2>
                        <p className="text-sm font-black text-green-700 mb-3">
                          Winner: {room.players.find(p => p.id === gameState.winner)?.name || 'Champion'}!
                        </p>
                        {isHost && (
                          <button
                            onClick={handleStart}
                            className="w-full py-2.5 sm:py-3 bg-[#facc15] hover:bg-yellow-300 text-black font-black uppercase text-xs sm:text-sm border-[3px] border-black rounded-xl shadow-[3px_3px_0px_#000] transition-all"
                          >
                            🔄 Play Rematch (5 Rounds)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT SEAT */}
              <div className="w-28 sm:w-36 flex justify-end">
                {renderPlayerSeat(rightPlayer, 'right')}
              </div>

            </div>

            {/* 3. BOTTOM SEAT: CURRENT USER (YOU) */}
            <div className="w-full flex justify-center z-10 pt-2">
              {renderPlayerSeat(bottomPlayer, 'bottom')}
            </div>

          </div>

          {/* SIDEBAR: LIVE CHAT */}
          <div className={`w-full lg:w-80 shrink-0 ${showChatDrawer ? 'block' : 'hidden lg:block'}`}>
            <ChatPanel messages={room.chat ?? []} onSend={handleChat} disabled={false} />
          </div>
        </div>
      )}
    </div>
  );
}
