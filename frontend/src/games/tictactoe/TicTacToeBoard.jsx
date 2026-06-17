import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';

// Reusable Chat Panel (Same as Connect 4)
function ChatPanel({ messages, onSend, disabled }) {
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <div className="glass-card flex flex-col h-full min-h-[280px] bg-[#0a0a0c]/80 border-white/[0.05]">
      <div className="px-4 py-4 border-b border-white/[0.05] font-bold tracking-widest text-xs uppercase text-gray-400">
        Room Chat
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-sm scrollbar-thin scrollbar-thumb-gray-800">
        {messages.length === 0 && (
          <p className="text-gray-600 text-center py-4 font-light italic">No messages yet</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="break-words">
            <span className="font-semibold text-gray-300">{msg.playerName}: </span>
            <span className="text-gray-400 font-light">{msg.message}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/[0.05] flex gap-2">
        <input
          type="text"
          className="input-field py-2 text-sm flex-1 bg-black/50"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          maxLength={500}
        />
        <button type="submit" className="btn-primary py-2 px-4 text-sm" disabled={disabled}>
          Send
        </button>
      </form>
    </div>
  );
}

export default function TicTacToeBoard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [room, setRoom] = useState(location.state?.room ?? null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [pendingMove, setPendingMove] = useState(null);

  const myPlayerId = room?.viewerId;
  const gameState = room?.gameState;
  const isPlaying = room?.status === 'playing';
  const isMyTurn = gameState?.currentPlayerId === myPlayerId;
  const mySymbol = gameState?.players?.find((p) => p.id === myPlayerId)?.symbol; // 'X' or 'O'
  const isHost = room?.hostId === myPlayerId;

  // Assume backend sends winningCells as an array of indices: e.g., [0, 1, 2]
  const winningSet = new Set(gameState?.winningCells ?? []);

  useEffect(() => {
    const socket = connectSocket();
    const username = sessionStorage.getItem('pohahub_username');

    const syncRoom = async () => {
      if (!username || !roomCode) return;
      const result = await emitWithAck('room:join', {
        roomCode: roomCode.toUpperCase(),
        playerName: username,
      });
      if (result.ok) {
        setRoom(result.room);
      } else if (!location.state?.room) {
        setError(result.error || 'Could not join room');
      }
    };

    const onConnect = () => {
      setConnected(true);
      syncRoom();
    };

    const onDisconnect = () => setConnected(false);

    const onRoomUpdate = (updatedRoom) => {
      if (updatedRoom.code === roomCode?.toUpperCase()) {
        setRoom(updatedRoom);
      }
    };

    const onChatMessage = (msg) => {
      setRoom((prev) =>
        prev ? { ...prev, chat: [...(prev.chat ?? []), msg] } : prev,
      );
    };

    const onRoomClosed = () => {
      setError('Room was closed');
      setTimeout(() => navigate('/games/tic-tac-toe'), 2000);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:update', onRoomUpdate);
    socket.on('chat:message', onChatMessage);
    socket.on('room:closed', onRoomClosed);

    if (socket.connected) {
      setConnected(true);
      syncRoom();
    } else {
      socket.connect();
    }

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('room:update', onRoomUpdate);
      socket.off('chat:message', onChatMessage);
      socket.off('room:closed', onRoomClosed);
    };
  }, [roomCode, navigate, location.state]);

  const handleStart = async () => {
    setError('');
    const result = await emitWithAck('room:start', {});
    if (!result.ok) {
      setError(result.error);
    }
  };

  const handleCellClick = useCallback(
    async (index) => {
      // Prevent click if it's not our turn, game isn't playing, cell is taken, or waiting on server
      if (!isPlaying || !isMyTurn || pendingMove !== null || gameState.board[index] !== null) return;
      
      setPendingMove(index);
      setError('');
      // Emit the move to the server
      const result = await emitWithAck('game:move', { index });
      setPendingMove(null);
      
      if (!result.ok) {
        setError(result.error);
      }
    },
    [isPlaying, isMyTurn, pendingMove, gameState?.board],
  );

  const handleChat = async (message) => {
    await emitWithAck('chat:message', { message });
  };

  if (!room) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="glass-card p-10 bg-[#0a0a0c]/80 border-white/[0.05]">
          <div className="animate-pulse text-gray-500 mb-2 tracking-widest uppercase text-sm">Connecting to room...</div>
          <p className="text-xl text-white font-mono">{roomCode}</p>
        </div>
      </div>
    );
  }

  const statusMessage = (() => {
    if (room.status === 'waiting') return `Waiting for players (${room.players.length}/${room.maxPlayers})`;
    if (gameState?.status === 'won') return `${gameState.winner?.name ?? 'Someone'} wins!`;
    if (gameState?.status === 'draw') return "It's a draw!";
    if (isMyTurn) return 'Your turn — make a move';
    const current = gameState?.players?.find((p) => p.id === gameState.currentPlayerId);
    return `${current?.name ?? 'Opponent'}'s turn`;
  })();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 relative">
      
      {/* INJECTED CSS FOR POPUP (Same as Connect 4) */}
      <style>{`
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.95) translateY(20px); filter: blur(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); }
        }
        @keyframes shimmerText {
          0% { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        .animate-pop-in { animation: popIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .text-shimmer {
          background: linear-gradient(90deg, #9ca3af 0%, #ffffff 50%, #9ca3af 100%);
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          animation: shimmerText 3s linear infinite;
        }
      `}</style>

      {/* PREMIUM CELEBRATION POPUP */}
      {(gameState?.status === 'won' || gameState?.status === 'draw') && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-700" />
          <div className="relative w-full max-w-md glass-card bg-[#0a0a0c] border border-white/[0.1] shadow-[0_0_50px_rgba(255,255,255,0.05)] p-10 text-center animate-pop-in rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-white/[0.03] to-transparent pointer-events-none" />
            <div className="relative z-10">
              {gameState.status === 'won' ? (
                <>
                  <div className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-4">Match Concluded</div>
                  <h2 className="text-5xl font-extrabold mb-2 text-shimmer tracking-tighter drop-shadow-2xl">
                    {gameState.winner?.name ?? 'Someone'}
                  </h2>
                  <h3 className="text-2xl font-light text-gray-300 mb-8 tracking-wide">claims the victory!</h3>
                </>
              ) : (
                <>
                  <div className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-4">Match Concluded</div>
                  <h2 className="text-5xl font-extrabold mb-8 text-gray-300 tracking-tighter">Stalemate</h2>
                </>
              )}
              <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent mb-8" />
              <Link 
                to="/games/tic-tac-toe" 
                className="btn-primary w-full block py-4 text-sm font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:bg-white text-[#050505] transition-all duration-300 rounded-xl"
              >
                Return to Hub
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        <div className="flex-1 space-y-6">
          <div className="glass-card p-8 bg-[#0a0a0c]/80 border-white/[0.05]">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border-b border-white/[0.05] pb-6">
              <div>
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-gray-600 mb-1">Room Code</p>
                <p className="text-3xl font-mono font-bold tracking-widest text-gray-200">{room.code}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold tracking-[0.2em] uppercase text-gray-600 mb-1">Status</p>
                <p className="font-medium text-gray-300 tracking-wide">{statusMessage}</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm backdrop-blur-sm">
                {error}
              </div>
            )}

            {room.status === 'waiting' && (
              <div className="text-center py-10 border border-dashed border-white/[0.1] rounded-2xl mb-6 bg-white/[0.01]">
                <p className="text-gray-400 mb-6 font-light">Share the room code with a friend. Start when both are here.</p>
                {isHost ? (
                  <button type="button" className="btn-primary" onClick={handleStart} disabled={room.players.length < 2}>
                    Initiate Match
                  </button>
                ) : (
                  <p className="text-sm text-gray-500 tracking-widest uppercase animate-pulse">Waiting for host...</p>
                )}
              </div>
            )}

            {/* THE TIC TAC TOE BOARD */}
            {gameState && (
              <div className="mx-auto max-w-sm mt-8">
                <div className="grid grid-cols-3 gap-3 p-4 rounded-3xl bg-[#111] border border-white/[0.05] shadow-[inset_0_10px_30px_rgba(0,0,0,0.8)]">
                  {gameState.board.map((cellValue, index) => {
                    const isWinningCell = winningSet.has(index);
                    return (
                      <button
                        key={index}
                        onClick={() => handleCellClick(index)}
                        disabled={!isPlaying || !isMyTurn || cellValue !== null || pendingMove !== null}
                        className={`aspect-square flex items-center justify-center rounded-2xl text-6xl font-extrabold transition-all duration-300 ${
                          cellValue === null 
                            ? 'bg-[#1a1c23] hover:bg-white/[0.05] cursor-pointer' 
                            : 'bg-[#0a0a0c] cursor-default'
                        } ${
                          isWinningCell ? 'ring-2 ring-white scale-105 z-10 shadow-[0_0_20px_rgba(255,255,255,0.2)]' : ''
                        }`}
                      >
                        {cellValue === 'X' && (
                          <span className="text-transparent bg-clip-text bg-gradient-to-br from-blue-400 to-blue-600 drop-shadow-[0_0_15px_rgba(96,165,250,0.5)] animate-pop-in">
                            X
                          </span>
                        )}
                        {cellValue === 'O' && (
                          <span className="text-transparent bg-clip-text bg-gradient-to-br from-rose-400 to-rose-600 drop-shadow-[0_0_15px_rgba(251,113,133,0.5)] animate-pop-in">
                            O
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {mySymbol && (
                  <p className="text-center text-sm text-gray-500 mt-8 tracking-wide">
                    You are playing as{' '}
                    <span className={`font-bold uppercase tracking-widest ${mySymbol === 'X' ? 'text-blue-400' : 'text-rose-400'}`}>
                      {mySymbol}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="lg:w-96">
          <ChatPanel messages={room.chat ?? []} onSend={handleChat} disabled={!connected} />
        </div>
      </div>
    </div>
  );
}