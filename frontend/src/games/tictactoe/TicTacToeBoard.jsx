import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby';

// Reusable Chat Panel (With Scrollbar Fix & Crash Protection)
function ChatPanel({ messages = [], onSend, disabled }) {
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
    <div className="flex flex-col w-full h-[350px] lg:h-[500px] bg-[#333333] border-[3px] border-black rounded-lg shadow-[6px_6px_0px_#000] rotate-1 text-white">
      
      <div className="px-4 py-3 sm:py-4 border-b-[3px] border-black font-bold uppercase tracking-widest text-xs text-gray-200 bg-[#222] shrink-0">
        Room Chat
      </div>
      
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 text-sm scrollbar-thin scrollbar-thumb-gray-600 bg-[#333]">
        {messages.length === 0 && (
          <p className="text-gray-400 text-center py-4 font-bold italic">No messages yet</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`break-words ${msg.playerId === 'SYSTEM' ? 'text-center my-3 bg-[#f9a8d4] text-black border-[2px] border-black rounded p-2 shadow-[2px_2px_0px_#000]' : ''}`}>
            {msg.playerId !== 'SYSTEM' && (
              <span className="font-black text-[#facc15] tracking-wider uppercase">{msg.playerName}: </span>
            )}
            <span className={msg.playerId === 'SYSTEM' ? 'font-black text-[11px] uppercase tracking-widest' : 'text-gray-100 font-medium'}>
              {msg.message}
            </span>
          </div>
        ))}
      </div>
      
      <form onSubmit={handleSubmit} className="p-2 sm:p-3 border-t-[3px] border-black flex gap-2 bg-[#2a2a2a] rounded-b-lg shrink-0">
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
          className="bg-[#facc15] text-black font-black uppercase border-[2px] border-black rounded px-4 py-2 shadow-[3px_3px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_#000] transition-all disabled:opacity-50 shrink-0"
          disabled={disabled}
        >
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
    const username = localStorage.getItem('pohahub_username');

    if (!username) {
      navigate(`/games/tic-tac-toe?join=${roomCode}`);
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

  const handlePlayAgain = async () => {
    setError('');
    const result = await emitWithAck('game:reset', {});
    if (!result.ok) {
      setError(result.error || 'Failed to start a new game');
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
    if (room.status === 'waiting') return `Waiting for players (${room.players.length}/${room.maxPlayers})`;
    if (gameState?.status === 'won') return `${gameState.winner?.name ?? 'Someone'} wins!`;
    if (gameState?.status === 'draw') return "It's a draw!";
    if (isMyTurn) return 'Your turn — make a move';
    const current = gameState?.players?.find((p) => p.id === gameState.currentPlayerId);
    return `${current?.name ?? 'Opponent'}'s turn`;
  })();

  return (
    <div className="w-full max-w-[1600px] mx-auto px-[clamp(0.5rem,2vw,1.5rem)] py-[clamp(1rem,3vw,2rem)] relative font-sans">
      
      {/* INJECTED CSS FOR POPUP */}
      <style>{`
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.8) translateY(30px) rotate(-5deg); }
          100% { opacity: 1; transform: scale(1) translateY(0) rotate(-2deg); }
        }
        .animate-pop-in { animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>

      {/* PREMIUM CELEBRATION POPUP */}
      {(gameState?.status === 'won' || gameState?.status === 'draw') && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" />
          <div className="relative w-full max-w-md bg-white border-[4px] border-black shadow-[12px_12px_0px_#000] p-10 text-center animate-pop-in rounded-xl -rotate-2">
            
            <div className="relative z-10 text-black">
              {gameState.status === 'won' ? (
                <>
                  <div className="text-sm font-bold tracking-widest uppercase text-gray-500 mb-2">Match Concluded</div>
                  <h2 className="text-[clamp(2.5rem,6vw,4rem)] font-black mb-2 text-[#f9a8d4] tracking-tighter uppercase" style={{ WebkitTextStroke: '2px black' }}>
                    {gameState.winner?.name ?? 'Someone'}
                  </h2>
                  <h3 className="text-2xl font-bold mb-8 uppercase">claims the victory!</h3>
                </>
              ) : (
                <>
                  <div className="text-sm font-bold tracking-widest uppercase text-gray-500 mb-2">Match Concluded</div>
                  <h2 className="text-5xl font-black mb-8 text-black tracking-tighter uppercase">Stalemate</h2>
                </>
              )}
              
              <div className="w-full h-[3px] bg-black mb-8" />
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handlePlayAgain}
                  className="bg-[#facc15] w-full block py-4 text-sm font-black tracking-widest uppercase border-[3px] border-black shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] text-black transition-all duration-150 rounded"
                >
                  Play Again
                </button>
                <Link 
                  to="/games/tic-tac-toe" 
                  className="bg-gray-200 w-full block py-4 text-sm font-bold tracking-widest uppercase border-[3px] border-black shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] text-black text-center transition-all duration-150 rounded"
                >
                  Return to Hub
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN SPLIT LAYOUT */}
      <div className="flex flex-col xl:flex-row gap-[clamp(1rem,3vw,2rem)] items-stretch">
        
        {/* LEFT COLUMN: GAME OR LOBBY */}
        <div className="flex-1 w-full min-w-0 flex flex-col">
          <div className="bg-[#333333] border-[3px] border-black rounded-lg p-6 sm:p-8 shadow-[8px_8px_0px_#000] -rotate-1 text-white">
            
            {/* Header Info */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border-b-[3px] border-black pb-6">
              <div>
                <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-1">Room Code</p>
                <p className="text-[clamp(1.5rem,4vw,2.25rem)] font-black tracking-widest text-white uppercase">{room.code}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-1">Status</p>
                <p className="font-black text-[#facc15] text-[clamp(0.8rem,2vw,1rem)] uppercase">{statusMessage}</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 px-4 py-3 bg-[#ef4444] border-[3px] border-black rounded text-black font-black uppercase shadow-[4px_4px_0px_#000]">
                {error}
              </div>
            )}

            {room.status === 'waiting' && (
              <WaitingLobby
                roomCode={room.code}
                isHost={isHost}
                playerCount={room.players.length}
                maxPlayers={2}
                onStart={handleStart}
                gamePath="tic-tac-toe/room"
              />
            )}

            {/* THE TIC TAC TOE BOARD */}
            {gameState && (
              <div className="mx-auto w-full max-w-[min(90vw,28rem)] mt-4">
                
                {/* Board Wrapper */}
                <div className="bg-white border-[4px] border-black p-3 sm:p-4 rounded-xl shadow-[8px_8px_0px_#000] rotate-1">
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    {gameState.board.map((cellValue, index) => {
                      const isWinningCell = winningSet.has(index);
                      
                      // Neo-Brutalist cell styling
                      let cellStyle = 'bg-gray-100 hover:bg-gray-200 hover:-translate-y-1 hover:shadow-[4px_4px_0px_#000] cursor-pointer';
                      if (cellValue !== null) cellStyle = 'bg-white shadow-[inset_2px_2px_0px_rgba(0,0,0,0.1)] cursor-default';
                      if (isWinningCell) cellStyle = 'bg-[#facc15] shadow-[4px_4px_0px_#000] z-10 scale-105';

                      return (
                        <button
                          key={index}
                          onClick={() => handleCellClick(index)}
                          disabled={!isPlaying || !isMyTurn || cellValue !== null || pendingMove !== null}
                          className={`aspect-square flex items-center justify-center rounded border-[3px] border-black text-[clamp(2.5rem,8vw,5rem)] font-black transition-all duration-150 uppercase disabled:hover:translate-y-0 disabled:hover:shadow-none ${cellStyle}`}
                        >
                          {cellValue === 'X' && (
                            <span className="text-[#3b82f6] animate-pop-in" style={{ WebkitTextStroke: '0px black' }}>
                              X
                            </span>
                          )}
                          {cellValue === 'O' && (
                            <span className="text-[#ef4444] animate-pop-in" style={{ WebkitTextStroke: 'Opx black' }}>
                              O
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {mySymbol && (
                  <p className="text-center text-sm font-black uppercase text-white mt-8 tracking-widest border-[3px] border-black bg-[#222] py-2 rounded rotate-1">
                    You are playing as{' '}
                    <span className={`${mySymbol === 'X' ? 'text-[#3b82f6]' : 'text-[#ef4444]'}`} style={{ WebkitTextStroke: '1px black' }}>
                      {mySymbol}
                    </span>
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CHAT PANEL */}
        <div className="w-full xl:w-80 2xl:w-96 flex flex-col shrink-0">
          <ChatPanel messages={room.chat ?? []} onSend={handleChat} disabled={!connected} />
        </div>
      </div>
    </div>
  );
}