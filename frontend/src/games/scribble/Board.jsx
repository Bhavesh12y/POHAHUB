import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';

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
    <div className="glass-card flex flex-col h-full bg-[#0a0a0c]/80 border-white/[0.05] rounded-2xl overflow-hidden min-h-[400px]">
      <div className="px-4 py-4 border-b border-white/[0.05] font-bold tracking-widest text-xs uppercase text-gray-400">
        Guesses & Chat
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-sm scrollbar-thin scrollbar-thumb-gray-800">
        {messages.length === 0 && (
          <p className="text-gray-600 text-center py-4 font-light italic">Type your guesses here...</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="break-words">
            <span className="font-semibold text-gray-300">{msg.playerName}: </span>
            <span className={`font-light ${msg.message.includes('🎉') ? 'text-emerald-400 font-bold tracking-wide' : 'text-gray-400'}`}>
              {msg.message}
            </span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/[0.05] flex gap-2">
        <input
          type="text"
          className="input-field py-2 text-sm flex-1 bg-black/50"
          placeholder="Guess..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          maxLength={100}
        />
        <button type="submit" className="btn-primary py-2 px-4 text-sm" disabled={disabled}>
          Send
        </button>
      </form>
    </div>
  );
}

export default function ScribbleBoard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [room, setRoom] = useState(location.state?.room ?? null);
  const [error, setError] = useState('');
  
  // Drawing State
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(5);

  const myPlayerId = room?.viewerId;
  const gameState = room?.gameState;
  const isMyTurn = gameState?.drawerId === myPlayerId;
  const isHost = room?.hostId === myPlayerId;

  const COLORS = ['#ffffff', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#0a0a0c']; // #0a0a0c acts as eraser against canvas bg

  useEffect(() => {
    const socket = connectSocket();
    const username = sessionStorage.getItem('pohahub_username');

    if (!username || !roomCode) {
      navigate('/');
      return;
    }

    const syncRoom = async () => {
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

    socket.on('connect', syncRoom);
    socket.on('room:update', (updatedRoom) => {
      if (updatedRoom.code === roomCode?.toUpperCase()) {
        setRoom(updatedRoom);
      }
    });

    socket.on('chat:message', (msg) => {
      setRoom((prev) => prev ? { ...prev, chat: [...(prev.chat ?? []), msg] } : prev);
    });

    // --- SOCKET DRAWING LISTENERS ---
    socket.on('draw:line', ({ x0, y0, x1, y1, color, size }) => {
      drawLine(x0, y0, x1, y1, color, size, false);
    });

    socket.on('draw:clear', () => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    });

    socket.on('room:closed', () => {
      setError('Room was closed');
      setTimeout(() => navigate('/games/scribble'), 2000);
    });

    if (socket.connected) {
      syncRoom();
    } else {
      socket.connect();
    }

    return () => {
      socket.off('connect');
      socket.off('room:update');
      socket.off('chat:message');
      socket.off('draw:line');
      socket.off('draw:clear');
      socket.off('room:closed');
    };
  }, [roomCode, navigate, location.state]);

  const handleStart = async () => {
    setError('');
    const result = await emitWithAck('room:start', {});
    if (!result.ok) setError(result.error);
  };

  const handleChat = async (message) => {
    await emitWithAck('chat:message', { message });
  };

  // --- CANVAS DRAWING LOGIC ---
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const drawLine = (x0, y0, x1, y1, strokeColor, lineWidth, emit = true) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
    ctx.closePath();

    if (!emit) return;
    emitWithAck('draw:line', { x0, y0, x1, y1, color: strokeColor, size: lineWidth });
  };

  const onMouseDown = (e) => {
    if (!isMyTurn || room?.status !== 'playing') return; 
    isDrawing.current = true;
    lastPos.current = getMousePos(e);
  };

  const onMouseMove = (e) => {
    if (!isDrawing.current || !isMyTurn || room?.status !== 'playing') return;
    const currentPos = getMousePos(e);
    drawLine(lastPos.current.x, lastPos.current.y, currentPos.x, currentPos.y, color, brushSize, true);
    lastPos.current = currentPos;
  };

  const onMouseUp = () => {
    isDrawing.current = false;
  };
  
  const clearCanvas = () => {
    if (!isMyTurn || room?.status !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    emitWithAck('draw:clear', {});
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

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative">
      
      {/* INJECTED CSS FOR POPUP */}
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
      {(gameState?.status === 'won') && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-700" />
          <div className="relative w-full max-w-md glass-card bg-[#0a0a0c] border border-white/[0.1] shadow-[0_0_50px_rgba(255,255,255,0.05)] p-10 text-center animate-pop-in rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-t from-white/[0.03] to-transparent pointer-events-none" />
            <div className="relative z-10">
              <div className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-4">Game Over</div>
              <h2 className="text-5xl font-extrabold mb-2 text-shimmer tracking-tighter drop-shadow-2xl">
                {gameState.winner?.name ?? 'Someone'}
              </h2>
              <h3 className="text-2xl font-light text-gray-300 mb-2 tracking-wide">is the best artist!</h3>
              <p className="text-gray-500 mb-8 font-mono">{gameState.winner?.score} points</p>
              
              <div className="w-full h-px bg-gradient-to-r from-transparent via-white/[0.1] to-transparent mb-8" />
              
              <Link 
                to="/games/scribble" 
                className="btn-primary w-full block py-4 text-sm font-bold tracking-widest uppercase shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:bg-white text-[#050505] transition-all duration-300 rounded-xl"
              >
                Return to Hub
              </Link>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm backdrop-blur-sm max-w-2xl mx-auto text-center">
          {error}
        </div>
      )}

      {/* Top Status Bar */}
      <div className="glass-card bg-[#0a0a0c]/80 border-white/[0.05] p-6 mb-6 flex flex-wrap justify-between items-center rounded-2xl gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-gray-600">Room Code</p>
          <p className="text-2xl font-mono font-bold text-gray-200">{room.code}</p>
        </div>
        
        {room.status === 'playing' && (
          <div className="text-center">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-gray-600 mb-1">Current Word</p>
            <p className="text-2xl font-medium tracking-[0.3em] text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              {gameState?.currentWord || "_ _ _ _ _"}
            </p>
          </div>
        )}

        <div className="text-right">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-gray-600">Status</p>
          <p className="font-medium text-gray-300">
            {room.status === 'waiting' ? 'Waiting for players...' : isMyTurn ? "You are drawing!" : "Guess the word!"}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* Drawing Area & Players */}
        <div className="flex-1 space-y-4">
          
          {room.status === 'waiting' ? (
             <div className="text-center py-16 border border-dashed border-white/[0.1] rounded-3xl bg-[#0a0a0c]/50 backdrop-blur-sm h-full flex flex-col items-center justify-center">
               <p className="text-gray-400 mb-6 font-light max-w-md">
                 Share the room code with friends. Need at least 2 players to start.
               </p>
               {isHost ? (
                 <button type="button" className="btn-primary px-8" onClick={handleStart} disabled={room.players.length < 2}>
                   Initiate Match
                 </button>
               ) : (
                 <p className="text-sm text-gray-500 tracking-widest uppercase animate-pulse">Waiting for host...</p>
               )}
             </div>
          ) : (
            <>
              {/* Tools Container */}
              <div className={`flex items-center justify-between p-4 glass-card bg-[#111] border border-white/[0.05] rounded-2xl transition-opacity ${!isMyTurn && 'opacity-50 pointer-events-none'}`}>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button 
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-8 h-8 rounded-full border-2 transition-transform hover:scale-110 ${
                        color === c ? 'border-gray-400 scale-110 shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'border-white/[0.1]'
                      }`}
                      style={{ backgroundColor: c }}
                      title={c === '#0a0a0c' ? 'Eraser' : 'Color'}
                    >
                      {c === '#0a0a0c' && <span className="text-[9px] text-gray-500 font-bold tracking-tighter">ERASE</span>}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Size:</span>
                    <input 
                      type="range" min="2" max="20" value={brushSize} 
                      onChange={(e) => setBrushSize(parseInt(e.target.value))}
                      className="w-24 accent-gray-400"
                    />
                  </div>
                  <button onClick={clearCanvas} className="text-xs font-bold tracking-[0.2em] uppercase text-red-400 hover:text-red-300 transition-colors">
                    Clear
                  </button>
                </div>
              </div>

              {/* The Canvas */}
              <div className={`relative w-full aspect-video rounded-3xl overflow-hidden bg-[#0a0a0c] border border-white/[0.1] shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] ${isMyTurn ? 'cursor-crosshair' : 'cursor-default'} group`}>
                <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] to-transparent pointer-events-none" />
                
                <canvas
                  ref={canvasRef}
                  width={800} // Fixed internal resolution
                  height={600}
                  className="w-full h-full block relative z-10"
                  onMouseDown={onMouseDown}
                  onMouseMove={onMouseMove}
                  onMouseUp={onMouseUp}
                  onMouseOut={onMouseUp}
                  onTouchStart={onMouseDown}
                  onTouchMove={onMouseMove}
                  onTouchEnd={onMouseUp}
                />
              </div>
              
              {/* Leaderboard / Players */}
              <div className="flex flex-wrap gap-4 mt-4">
                {gameState?.players?.map((player) => (
                  <div key={player.id} className={`flex items-center gap-3 px-4 py-2 rounded-xl bg-[#111] border ${player.id === gameState.drawerId ? 'border-white/[0.2] shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'border-white/[0.05]'}`}>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-300">
                        {player.name} {player.id === gameState.drawerId && '✏️'}
                      </span>
                      <span className="text-xs text-gray-500 font-mono">{player.score} pts</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Chat / Guessing Panel */}
        <div className="lg:w-80">
          <ChatPanel messages={room.chat ?? []} onSend={handleChat} disabled={!room} />
        </div>

      </div>
    </div>
  );
}