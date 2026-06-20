import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby';

const COLS = 7;
const ROWS = 6;

function Disc({ color, isWinning, animate }) {
  const colorClass =
    color === 'red'
      ? 'bg-[#ef4444]' // Flat Red
      : color === 'yellow'
      ? 'bg-[#facc15]' // Flat Yellow
      : 'bg-white';    // Empty cell

  return (
    <div
      className={`w-full aspect-square rounded-full transition-all duration-300 border-[3px] border-black shadow-[inset_-3px_-3px_0px_rgba(0,0,0,0.15)] ${colorClass} ${
        isWinning ? 'ring-4 ring-white ring-offset-4 ring-offset-black scale-110 z-10' : ''
      } ${animate ? 'animate-drop' : ''}`}
    />
  );
}

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
    <div className="flex flex-col h-full min-h-[280px] bg-[#333333] border-[3px] border-black rounded-lg shadow-[6px_6px_0px_#000] rotate-1 text-white">
      <div className="px-4 py-3 border-b-[3px] border-black font-bold uppercase tracking-wide text-sm text-gray-200">
        Room Chat
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-sm scrollbar-thin scrollbar-thumb-gray-600">
        {messages.length === 0 && (
          <p className="text-gray-400 text-center py-4 font-light italic">No messages yet</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="break-words">
            <span className="font-bold text-[#facc15]">{msg.playerName}: </span>
            <span className="text-gray-100">{msg.message}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-3 border-t-[3px] border-black flex gap-2 bg-[#2a2a2a] rounded-b-lg">
        <input
          type="text"
          className="py-2 px-3 text-sm flex-1 bg-black border-[2px] border-black rounded text-white focus:outline-none focus:ring-2 focus:ring-[#facc15]"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          maxLength={500}
        />
        <button
          type="submit"
          className="bg-[#facc15] text-black font-bold uppercase border-[2px] border-black rounded px-4 py-2 shadow-[3px_3px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_#000] transition-all disabled:opacity-50"
          disabled={disabled}
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default function ConnectFourBoard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [room, setRoom] = useState(location.state?.room ?? null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [pendingColumn, setPendingColumn] = useState(null);

  const lastMoveRef = useRef(null);

  const myPlayerId = room?.viewerId;
  const gameState = room?.gameState;
  const isPlaying = room?.status === 'playing';
  const isMyTurn = gameState?.currentPlayerId === myPlayerId;
  const myColor = gameState?.players?.find((p) => p.id === myPlayerId)?.color;
  const isHost = room?.hostId === myPlayerId;

  const winningSet = new Set(
    (gameState?.winningCells ?? []).map(([r, c]) => `${r}-${c}`),
  );

  useEffect(() => {
    if (gameState) {
      if (gameState.board) {
        console.log('ConnectFourBoard gameState.board:', gameState.board);
      } else {
        console.warn('ConnectFourBoard received gameState without board:', gameState);
      }
    }
  }, [gameState]);

  useEffect(() => {
    const socket = connectSocket();
    const username = localStorage.getItem('pohahub_username');

    if (!username) {
      navigate(`/games/connect-four?join=${roomCode}`);
      return;
    }

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
        if (
          updatedRoom.gameState?.lastMove &&
          updatedRoom.gameState.lastMove !== lastMoveRef.current
        ) {
          lastMoveRef.current = updatedRoom.gameState.lastMove;
        }
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
      setTimeout(() => navigate('/games/connect-four'), 2000);
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

  const handleDrop = useCallback(
    async (column) => {
      if (!isPlaying || !isMyTurn || pendingColumn !== null) return;
      setPendingColumn(column);
      setError('');
      const result = await emitWithAck('game:move', { column });
      setPendingColumn(null);
      if (!result.ok) {
        setError(result.error);
      }
    },
    [isPlaying, isMyTurn, pendingColumn],
  );

  const handleChat = async (message) => {
    await emitWithAck('chat:message', { message });
  };

  const handlePlayAgain = async () => {
    setError('');
    const result = await emitWithAck('game:reset', {});
    if (!result.ok) {
      setError(result.error || 'Failed to restart the game');
    }
  };

  if (!room) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] p-10 rounded-lg max-w-md mx-auto -rotate-1">
          <div className="animate-pulse text-gray-500 font-bold mb-2 tracking-widest uppercase text-sm">Connecting to room...</div>
          <p className="text-3xl text-black font-black font-mono">{roomCode}</p>
          {!connected && (
            <p className="text-sm text-[#ef4444] font-bold mt-4">
              Server connection failed.
            </p>
          )}
        </div>
      </div>
    );
  }

  const statusMessage = (() => {
    if (room.status === 'waiting') {
      return `Waiting for players (${room.players.length}/${room.maxPlayers})`;
    }
    if (gameState?.status === 'won') {
      const winnerName = gameState.winner?.name ?? 'Someone';
      return `${winnerName} wins!`;
    }
    if (gameState?.status === 'draw') {
      return "It's a draw!";
    }
    if (isMyTurn) {
      return 'Your turn — pick a column';
    }
    const current = gameState?.players?.find((p) => p.id === gameState.currentPlayerId);
    return `${current?.name ?? 'Opponent'}'s turn`;
  })();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative font-sans">
      
      {/* INJECTED CSS FOR POPUP ANIMATION */}
      <style>{`
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.8) translateY(30px) rotate(-5deg); }
          100% { opacity: 1; transform: scale(1) translateY(0) rotate(-2deg); }
        }
        .animate-pop-in {
          animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
      `}</style>

      {/* PREMIUM CELEBRATION POPUP - Neo-Brutalist Version */}
      {(gameState?.status === 'won' || gameState?.status === 'draw') && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" />
          
          {/* Modal Card */}
          <div className="relative w-full max-w-md bg-white border-[4px] border-black shadow-[12px_12px_0px_#000] p-10 text-center animate-pop-in rounded-xl overflow-hidden -rotate-2">
            
            <div className="relative z-10 text-black">
              {gameState.status === 'won' ? (
                <>
                  <div className="text-sm font-bold tracking-widest uppercase text-gray-500 mb-2">
                    Match Concluded
                  </div>
                  <h2 className="text-[clamp(1.75rem,5vw,3rem)] font-black mb-2 text-[#ef4444] tracking-tighter uppercase" style={{ WebkitTextStroke: '2px black' }}>
                    {gameState.winner?.name ?? 'Someone'} 
                  </h2>
                  <h3 className="text-2xl font-bold mb-8 uppercase">
                    claims the victory!
                  </h3>
                </>
              ) : (
                <>
                  <div className="text-sm font-bold tracking-widest uppercase text-gray-500 mb-2">
                    Match Concluded
                  </div>
                  <h2 className="text-[clamp(1.75rem,5vw,3rem)] font-black mb-8 text-black tracking-tighter uppercase">
                    Stalemate
                  </h2>
                </>
              )}
              
              <div className="w-full h-[3px] bg-black mb-8" />
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handlePlayAgain}
                  className="bg-[#facc15] w-full block py-4 text-sm font-black tracking-widest uppercase border-[3px] border-black shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] text-black transition-all duration-150 rounded"
                >
                  Play Again
                </button>
                <Link 
                  to="/games/connect-four" 
                  className="bg-gray-200 w-full block py-4 text-sm font-bold tracking-widest uppercase border-[3px] border-black shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] text-black text-center transition-all duration-150 rounded"
                >
                  Return to Hub
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col xl:flex-row gap-8">
        {/* Main Game Column */}
        <div className="flex-1 space-y-6">
          <div className="p-8 bg-[#333333] border-[3px] border-black rounded-lg shadow-[8px_8px_0px_#000] -rotate-1 text-white">
            
            {/* Header Info */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border-b-[3px] border-black pb-6">
              <div>
                <p className="text-xs font-bold uppercase text-gray-400 mb-1">Room Code</p>
                <p className="text-[clamp(1.25rem,3vw,2rem)] font-bold tracking-widest text-white">
                  {room.code}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold uppercase text-gray-400 mb-1">Status</p>
                <p className="font-bold text-[#facc15]">{statusMessage}</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 px-4 py-3 bg-red-500 border-[3px] border-black rounded text-black font-bold shadow-[4px_4px_0px_#000]">
                {error}
              </div>
            )}

            {/* Players List */}
            <div className="flex flex-wrap gap-4 mb-8">
              {room.players.map((player) => {
                const color = gameState?.players?.find((p) => p.id === player.id)?.color;
                return (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 px-4 py-2 bg-white rounded-full border-[3px] border-black shadow-[3px_3px_0px_#000] text-black"
                  >
                    {color && (
                      <span
                        className={`w-4 h-4 rounded-full border-2 border-black ${
                          color === 'red' ? 'bg-[#ef4444]' : 'bg-[#facc15]'
                        }`}
                      />
                    )}
                    <span className="text-sm font-bold">
                      {player.name}
                      <span className="text-gray-500 font-normal ml-1">
                        {player.id === room.hostId && '(Host)'}
                        {player.id === myPlayerId && '(You)'}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>

            {room.status === 'waiting' && (
              <WaitingLobby 
                roomCode={room.code} 
                isHost={isHost} 
                playerCount={room.players.length} 
                onStart={handleStart} 
                gamePath="connect-four/room" 
              />
            )}

            {/* The Game Board Area */}
            {gameState && (
              <div className="mx-auto w-full max-w-sm xl:max-w-md bg-white p-4 sm:p-6 rounded-lg border-[3px] border-black shadow-[6px_6px_0px_#000] rotate-1">
                
                {/* Column Drop Buttons */}
                <div className="grid grid-cols-7 gap-2 mb-4">
                  {Array.from({ length: COLS }).map((_, col) => (
                    <button
                      key={col}
                      type="button"
                      className="aspect-square rounded-full border-[3px] border-black bg-[#facc15] text-black font-bold text-xl shadow-[3px_3px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_#000] transition-all disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:translate-x-0 disabled:hover:shadow-[3px_3px_0px_#000] disabled:cursor-not-allowed"
                      onClick={() => handleDrop(col)}
                      disabled={
                        !isPlaying ||
                        !isMyTurn ||
                        pendingColumn !== null ||
                        gameState.status !== 'playing'
                      }
                      aria-label={`Drop in column ${col + 1}`}
                    >
                      ↓
                    </button>
                  ))}
                </div>

                {/* The Board Grid */}
                <div className="p-3 rounded-lg bg-[#3b82f6] border-[3px] border-black shadow-[inset_4px_4px_0px_rgba(0,0,0,0.2)]">
                  {gameState.board ? (
                    <div className="grid grid-cols-7 gap-2">
                      {gameState.board.map((row, rowIndex) =>
                        row.map((cell, colIndex) => {
                          const isLastMove =
                            gameState.lastMove?.row === rowIndex &&
                            gameState.lastMove?.column === colIndex;
                          return (
                            <Disc
                              key={`${rowIndex}-${colIndex}`}
                              color={cell}
                              isWinning={winningSet.has(`${rowIndex}-${colIndex}`)}
                              animate={isLastMove}
                            />
                          );
                        }),
                      )}
                    </div>
                  ) : (
                    <div className="rounded-lg border-[3px] border-dashed border-black bg-white p-12 text-center text-black font-bold">
                      <p>Waiting for board data...</p>
                    </div>
                  )}
                </div>

                {myColor && (
                  <p className="text-center text-sm font-bold text-black mt-6 uppercase">
                    You are playing as{' '}
                    <span className={myColor === 'red' ? 'text-[#ef4444]' : 'text-[#facc15] text-stroke-black'}>
                      {myColor}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Chat Column */}
        <div className="xl:w-80 shrink-0">
          <ChatPanel
            messages={room.chat ?? []}
            onSend={handleChat}
            disabled={!connected}
          />
        </div>
      </div>
    </div>
  );
}