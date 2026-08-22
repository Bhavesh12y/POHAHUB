import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby.jsx';
import VoiceChat from '../../components/VoiceChat.jsx';
import ChatPanel from '../../components/ChatPanel.jsx';
import RoleCard from './RoleCard.jsx';
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
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [currentRoundNum, gameState?.roundPhase]);

  // Confetti on win
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

  // Symmetrical relative 4-side seating (current user always at bottom)
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
      <div className="text-center py-24 text-black font-black uppercase tracking-widest text-lg animate-pulse">
        Connecting to room...
      </div>
    );
  }

  // Render individual player seat
  const renderSeat = (player, position) => {
    if (!player) return null;
    const isMe = player.id === myPlayerId;
    const roleKey = gameState?.roundRoles?.[player.id];

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
    const totalScore = gameState?.scores?.[player.id] || 0;

    return (
      <div
        onClick={() => {
          if (isSuspectCandidate) setSelectedSuspect(player.id);
        }}
        className={`flex flex-col items-center justify-center transition-all ${
          isSuspectCandidate ? 'cursor-pointer hover:scale-105 active:scale-95' : ''
        }`}
      >
        {/* Name / Score Badge */}
        <div
          className={`flex items-center gap-1.5 px-2 sm:px-3 py-0.5 rounded-full border-2 border-black shadow-[2px_2px_0px_#000] mb-1.5 ${
            isSelectedSuspect
              ? 'bg-red-500 text-white ring-2 ring-red-400'
              : isSuspectCandidate
              ? 'bg-yellow-300 text-black ring-2 ring-amber-500 animate-pulse'
              : isMe
              ? 'bg-yellow-200 text-black'
              : 'bg-white text-black'
          }`}
        >
          <span className="text-[10px] sm:text-xs font-black uppercase max-w-[80px] sm:max-w-[100px] truncate">
            {player.name} {isMe && '(You)'}
          </span>
          <span className="text-[9px] sm:text-[10px] font-black bg-black text-white px-1 py-0.2 rounded-full">
            {totalScore}
          </span>
        </div>

        {/* Card Component */}
        <div className={isMe ? 'w-28 sm:w-36 h-28 sm:h-36' : 'w-20 sm:w-28 h-24 sm:h-32'}>
          {isMe ? (
            /* Current User Card (Tappable to Peek) */
            <div
              onClick={() => setIsUnfolded(!isUnfolded)}
              className="w-full h-full cursor-pointer select-none transition-transform hover:scale-105 active:scale-95"
            >
              {isUnfolded && roleKey ? (
                <RoleCard roleKey={roleKey} isRevealed={true} />
              ) : (
                <div className="w-full h-full bg-amber-50 border-[3px] border-black rounded-xl p-2 shadow-[3px_3px_0px_#000] flex flex-col items-center justify-center text-center">
                  <div className="w-7 h-9 bg-[#fed7aa] border-2 border-black rounded shadow-[1px_1px_0px_#000] flex items-center justify-center mb-1">
                    <span className="font-black text-[9px] text-amber-950">CHIT</span>
                  </div>
                  <span className="text-[10px] font-black uppercase text-amber-950">
                    Your Chit
                  </span>
                  <span className="text-[9px] font-black text-amber-800 bg-amber-200 px-1.5 py-0.5 rounded mt-0.5 border border-amber-400">
                    Tap to Peek
                  </span>
                </div>
              )}
            </div>
          ) : (
            /* Opponent Cards */
            <div className="w-full h-full">
              {isRolePubliclyRevealed && roleKey ? (
                <RoleCard roleKey={roleKey} isRevealed={true} />
              ) : (
                <div
                  className={`w-full h-full bg-[#fed7aa] border-[3px] border-black rounded-xl p-2 shadow-[2px_2px_0px_#000] flex flex-col items-center justify-center text-center ${
                    isSelectedSuspect ? 'ring-2 ring-red-500 bg-red-100' : ''
                  }`}
                >
                  <div className="w-6 h-8 bg-amber-100 border border-black rounded flex items-center justify-center mb-1">
                    <span className="font-black text-[8px] text-amber-900">CHIT</span>
                  </div>
                  <span className="text-[9px] sm:text-[10px] font-black uppercase text-amber-950">
                    Secret Chit
                  </span>
                  {isSuspectCandidate && (
                    <span className="text-[8px] sm:text-[9px] font-black uppercase bg-red-500 text-white px-1.5 py-0.2 rounded mt-1">
                      Suspect
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-[1300px] mx-auto px-2 sm:px-4 py-2 sm:py-3 font-sans select-none">
      
      {/* TOP COMPACT STATUS BAR */}
      <div className="bg-[#fef08a] border-[3px] border-black rounded-xl p-2 sm:p-3 shadow-[4px_4px_0px_#000] mb-2 sm:mb-3 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xs sm:text-base font-black uppercase tracking-wider text-black leading-none">
            Raja Mantri Chor Sipahi
          </h1>
          <p className="text-[10px] font-bold text-gray-700 uppercase mt-0.5">
            Room: <span className="bg-white px-1.5 py-0.2 border border-black rounded text-black font-mono">{room.code}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <VoiceChat roomCode={room.code} />
          {gameState && (
            <div className="bg-white border-2 border-black px-2.5 py-0.5 rounded text-center font-black">
              <span className="text-[9px] text-gray-500 uppercase block leading-none">Round</span>
              <span className="text-xs sm:text-sm text-black leading-none">{gameState.currentRound} / {gameState.totalRounds}</span>
            </div>
          )}
          <button
            onClick={() => setShowChatDrawer(!showChatDrawer)}
            className="lg:hidden bg-white border-2 border-black px-2 py-1 rounded text-xs font-black uppercase"
          >
            Chat
          </button>
        </div>
      </div>

      {/* LOBBY OR COURT */}
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
        <div className="flex flex-col lg:flex-row gap-3 items-start">
          
          {/* COURT TABLE CONTAINER */}
          <div className="flex-1 w-full bg-[#fffbeb] border-[3px] sm:border-[4px] border-black rounded-2xl p-2 sm:p-4 shadow-[6px_6px_0px_#000] flex flex-col justify-between min-h-[500px] sm:min-h-[560px]">
            
            {/* 1. TOP ROW: OPPOSITE PLAYER */}
            <div className="w-full flex justify-center py-1">
              {renderSeat(topPlayer, 'top')}
            </div>

            {/* 2. MIDDLE ROW: LEFT PLAYER | CENTER COURT STAGE | RIGHT PLAYER */}
            <div className="w-full flex items-center justify-between gap-1 sm:gap-3 my-auto py-2">
              
              {/* Left Player */}
              <div className="w-20 sm:w-28 flex justify-start">
                {renderSeat(leftPlayer, 'left')}
              </div>

              {/* Center Court Stage */}
              <div className="flex-1 max-w-[240px] sm:max-w-xs mx-auto bg-white border-[3px] border-black rounded-xl p-2.5 sm:p-3.5 text-center shadow-[4px_4px_0px_#000]">
                {isShuffling ? (
                  <div className="py-4">
                    <span className="text-xs font-black uppercase tracking-wider text-amber-900 bg-amber-200 px-3 py-1 rounded-full border border-black animate-pulse">
                      Shuffling Chits...
                    </span>
                  </div>
                ) : (
                  <div>
                    {/* PHASE 1: REVEALING / RAJA CALL */}
                    {gameState.roundPhase === 'revealing' && (
                      <div>
                        <h2 className="text-xs sm:text-sm font-black uppercase text-black mb-1">
                          Round {gameState.currentRound}
                        </h2>
                        <p className="text-[10px] sm:text-xs font-bold text-gray-700 mb-2">
                          Tap your chit below to privately see your role.
                        </p>

                        {myRole === 'RAJA' ? (
                          <button
                            onClick={() => handleAction('raja_call')}
                            disabled={actionLoading}
                            className="w-full py-2 bg-[#facc15] hover:bg-yellow-300 text-black font-black uppercase text-xs border-2 border-black rounded-lg shadow-[2px_2px_0px_#000] transition-all"
                          >
                            Call: "Mera Mantri Kaun?"
                          </button>
                        ) : (
                          <div className="text-[10px] font-black uppercase text-amber-900 bg-amber-100 p-1.5 rounded border border-amber-300 animate-pulse">
                            Waiting for Raja to summon Mantri...
                          </div>
                        )}
                      </div>
                    )}

                    {/* PHASE 2: MANTRI REVEAL */}
                    {gameState.roundPhase === 'mantri_call' && (
                      <div>
                        <h2 className="text-xs sm:text-sm font-black uppercase text-black mb-1">
                          "Mera Mantri Kaun?"
                        </h2>
                        <p className="text-[10px] sm:text-xs font-bold text-gray-700 mb-2">
                          The King has summoned the Minister.
                        </p>

                        {myRole === 'MANTRI' ? (
                          <button
                            onClick={() => handleAction('mantri_reveal')}
                            disabled={actionLoading}
                            className="w-full py-2 bg-[#38bdf8] hover:bg-sky-300 text-black font-black uppercase text-xs border-2 border-black rounded-lg shadow-[2px_2px_0px_#000] transition-all"
                          >
                            Declare: "Main Hoon Sarkar!"
                          </button>
                        ) : (
                          <div className="text-[10px] font-black uppercase text-sky-900 bg-sky-100 p-1.5 rounded border border-sky-300 animate-pulse">
                            Waiting for Mantri to step forward...
                          </div>
                        )}
                      </div>
                    )}

                    {/* PHASE 3: MANTRI GUESS */}
                    {gameState.roundPhase === 'mantri_guess' && (
                      <div>
                        <h2 className="text-xs sm:text-sm font-black uppercase text-red-600 mb-1">
                          Identify The Chor
                        </h2>

                        {myRole === 'MANTRI' ? (
                          <div>
                            <p className="text-[10px] sm:text-xs font-bold text-gray-700 mb-2">
                              Tap a suspect chit on the board to accuse.
                            </p>
                            {selectedSuspect ? (
                              <button
                                onClick={() => handleAction('mantri_guess', { suspectId: selectedSuspect })}
                                disabled={actionLoading}
                                className="w-full py-2 bg-red-500 hover:bg-red-600 text-white font-black uppercase text-xs border-2 border-black rounded-lg shadow-[2px_2px_0px_#000] transition-all"
                              >
                                Accuse: {room.players.find(p => p.id === selectedSuspect)?.name}
                              </button>
                            ) : (
                              <div className="text-[10px] font-black uppercase text-red-700 bg-red-100 p-1.5 rounded border border-red-300">
                                Tap a suspect chit on the board
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] font-black uppercase text-gray-800 bg-amber-100 p-1.5 rounded border border-amber-300 animate-pulse">
                            Mantri is deciding between the suspects...
                          </div>
                        )}
                      </div>
                    )}

                    {/* PHASE 4: ROUND RESULT */}
                    {gameState.roundPhase === 'round_result' && (
                      <div>
                        <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-black mb-1">
                          {gameState.isGuessCorrect ? "Mantri Caught The Chor" : "Chor Escaped Detection"}
                        </h2>
                        <p className="text-[10px] sm:text-xs font-bold text-gray-700 mb-2">
                          {gameState.isGuessCorrect 
                            ? "Correct guess. Mantri earns 800 pts, Chor gets 0 pts." 
                            : "Wrong guess. Chor stole Mantri's 800 pts (Chor: +800, Mantri: 0)."}
                        </p>

                        {gameState.status === 'playing' && (
                          <button
                            onClick={() => handleAction('next_round')}
                            disabled={actionLoading}
                            className="w-full py-2 bg-[#4ade80] hover:bg-green-300 text-black font-black uppercase text-xs border-2 border-black rounded-lg shadow-[2px_2px_0px_#000] transition-all"
                          >
                            Next Round ({gameState.currentRound + 1}/{gameState.totalRounds}) &rarr;
                          </button>
                        )}
                      </div>
                    )}

                    {/* PHASE 5: GAME OVER */}
                    {gameState.status === 'finished' && (
                      <div className="py-1">
                        <h2 className="text-sm sm:text-base font-black uppercase text-black mb-1">Match Completed</h2>
                        <p className="text-xs font-black text-green-700 mb-2">
                          Winner: {room.players.find(p => p.id === gameState.winner)?.name || 'Champion'}
                        </p>
                        {isHost && (
                          <button
                            onClick={handleStart}
                            className="w-full py-2 bg-[#facc15] hover:bg-yellow-300 text-black font-black uppercase text-xs border-2 border-black rounded-lg shadow-[2px_2px_0px_#000] transition-all"
                          >
                            Play Rematch (5 Rounds)
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Right Player */}
              <div className="w-20 sm:w-28 flex justify-end">
                {renderSeat(rightPlayer, 'right')}
              </div>

            </div>

            {/* 3. BOTTOM ROW: YOU */}
            <div className="w-full flex justify-center py-1">
              {renderSeat(bottomPlayer, 'bottom')}
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
