import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';

function ChatPanel({ messages, onSend, disabled }) {
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
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
        />
        <button type="submit" className="btn-primary py-2 px-4 text-sm" disabled={disabled}>Send</button>
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
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Drawing State
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(5);

  const gameState = room?.gameState;
  const myPlayerId = room?.viewerId;
  const isMyTurn = gameState?.drawerId === myPlayerId;
  const isHost = room?.hostId === myPlayerId;

  const COLORS = ['#ffffff', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#0a0a0c'];

  useEffect(() => {
    const socket = connectSocket();
    const username = sessionStorage.getItem('pohahub_username');
    if (!username) return navigate('/');

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

    socket.on('draw:line', ({ x0, y0, x1, y1, color, size }) => drawLine(x0, y0, x1, y1, color, size, false));
    socket.on('draw:clear', () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, 800, 600);
    });

    if (socket.connected) syncRoom();
    else socket.connect();

    return () => {
      socket.off('connect'); socket.off('room:update'); socket.off('chat:message');
      socket.off('draw:line'); socket.off('draw:clear');
    };
  }, [roomCode, navigate]);

  // Local Timer Loop
  useEffect(() => {
    let interval;
    if (gameState?.turnState === 'drawing' && gameState?.startTime) {
      interval = setInterval(() => {
        const elapsed = (Date.now() - gameState.startTime) / 1000;
        const remaining = Math.max(0, Math.floor(gameState.timeLimit - elapsed));
        setTimeLeft(remaining);
      }, 500);
    } else {
      setTimeLeft(0);
    }
    return () => clearInterval(interval);
  }, [gameState?.turnState, gameState?.startTime, gameState?.timeLimit]);

  const handleStart = async () => emitWithAck('room:start', {});
  const handleChat = async (message) => emitWithAck('chat:message', { message });
  const selectWord = (word) => emitWithAck('game:selectWord', { word });

  // --- CANVAS DRAWING LOGIC ---
  const getMousePos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * (canvas.width / rect.width),
      y: (clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const drawLine = (x0, y0, x1, y1, strokeColor, lineWidth, emit = true) => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1);
    ctx.strokeStyle = strokeColor; ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke(); ctx.closePath();
    if (emit) emitWithAck('draw:line', { x0, y0, x1, y1, color: strokeColor, size: lineWidth });
  };

  const onMouseDown = (e) => {
    if (!isMyTurn || gameState?.turnState !== 'drawing') return; 
    isDrawing.current = true; lastPos.current = getMousePos(e);
  };
  const onMouseMove = (e) => {
    if (!isDrawing.current) return;
    const cur = getMousePos(e);
    drawLine(lastPos.current.x, lastPos.current.y, cur.x, cur.y, color, brushSize, true);
    lastPos.current = cur;
  };
  const onMouseUp = () => isDrawing.current = false;
  
  const clearCanvas = () => {
    if (!isMyTurn) return;
    canvasRef.current?.getContext('2d').clearRect(0, 0, 800, 600);
    emitWithAck('draw:clear', {});
  };

  if (!room) return <div className="text-center py-24 text-gray-500 uppercase tracking-widest animate-pulse">Connecting...</div>;

  // Rank players by score
  const sortedPlayers = [...(gameState?.players || [])].sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative">
      
      {/* POPUP CSS */}
      <style>{`
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.95) translateY(20px); filter: blur(10px); } 100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); } }
        @keyframes shimmerText { 0% { background-position: -200% center; } 100% { background-position: 200% center; } }
        .animate-pop-in { animation: popIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .text-shimmer { background: linear-gradient(90deg, #9ca3af 0%, #ffffff 50%, #9ca3af 100%); background-size: 200% auto; color: transparent; -webkit-background-clip: text; animation: shimmerText 3s linear infinite; }
      `}</style>

      {/* WINNER POPUP */}
      {(gameState?.status === 'won') && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div className="relative w-full max-w-md glass-card bg-[#0a0a0c] border border-white/[0.1] shadow-[0_0_50px_rgba(255,255,255,0.05)] p-10 text-center animate-pop-in rounded-3xl">
            <div className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-4">Match Concluded</div>
            <h2 className="text-5xl font-extrabold mb-2 text-shimmer tracking-tighter drop-shadow-2xl">{gameState.winner?.name}</h2>
            <h3 className="text-xl font-light text-gray-300 mb-2 tracking-wide">is the Grand Artist!</h3>
            <p className="text-gray-500 mb-8 font-mono">{gameState.winner?.score} points</p>
            <Link to="/games/scribble" className="btn-primary w-full block py-4 text-sm font-bold uppercase rounded-xl">Return to Hub</Link>
          </div>
        </div>
      )}

      {/* TOP STATUS BAR */}
      <div className="glass-card bg-[#0a0a0c]/80 border-white/[0.05] p-6 mb-6 flex flex-wrap justify-between items-center rounded-2xl gap-4 relative overflow-hidden">
        {/* Timer Progress Bar Background */}
        {gameState?.turnState === 'drawing' && (
           <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-emerald-400 to-rose-500 transition-all duration-500 ease-linear" 
                style={{ width: `${(timeLeft / gameState.timeLimit) * 100}%` }} />
        )}

        <div className="w-1/3">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-gray-600">Round {gameState?.round || 1} / {gameState?.maxRounds || 3}</p>
          <p className="text-xl font-mono font-bold text-gray-200">
            {gameState?.turnState === 'drawing' ? `⏳ ${timeLeft}s` : 'Waiting'}
          </p>
        </div>
        
        <div className="w-1/3 text-center">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-gray-600 mb-1">Word</p>
          <p className="text-2xl font-medium tracking-[0.3em] text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] min-h-[36px]">
            {gameState?.currentWord || "_ _ _ _ _"}
          </p>
        </div>

        <div className="w-1/3 text-right">
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-gray-600">Status</p>
          <p className="font-medium text-gray-300">
            {room.status === 'waiting' ? 'Waiting for players' : gameState?.turnState === 'selecting' ? 'Choosing Word...' : isMyTurn ? "Draw!" : "Guess!"}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* DRAWING AREA */}
        <div className="flex-1 space-y-4">
          
          {room.status === 'waiting' ? (
             <div className="text-center py-20 border border-dashed border-white/[0.1] rounded-3xl bg-[#0a0a0c]/50 h-full flex flex-col items-center justify-center">
               <p className="text-gray-400 mb-6 font-light max-w-sm">Share code: <strong className="text-white font-mono">{room.code}</strong><br/>Need at least 2 players to start.</p>
               {isHost ? <button className="btn-primary" onClick={handleStart} disabled={room.players.length < 2}>Start Game</button> : <p className="text-gray-500 animate-pulse uppercase tracking-widest text-sm">Waiting for host...</p>}
             </div>
          ) : (
            <>
              {/* Canvas Controls */}
              <div className={`flex justify-between items-center p-4 glass-card bg-[#111] border-white/[0.05] rounded-2xl transition-opacity ${(!isMyTurn || gameState?.turnState !== 'drawing') && 'opacity-50 pointer-events-none'}`}>
                <div className="flex gap-2">
                  {COLORS.map(c => (
                    <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 rounded-full border-2 ${color === c ? 'border-gray-400 scale-110' : 'border-white/[0.1]'}`} style={{ backgroundColor: c }}>
                      {c === '#0a0a0c' && <span className="text-[9px] text-gray-500 font-bold tracking-tighter">ERASE</span>}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-6">
                  <input type="range" min="2" max="20" value={brushSize} onChange={(e) => setBrushSize(parseInt(e.target.value))} className="w-24" />
                  <button onClick={clearCanvas} className="text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-300">Clear</button>
                </div>
              </div>

              {/* The Board */}
              <div className={`relative w-full aspect-video rounded-3xl overflow-hidden bg-[#0a0a0c] border border-white/[0.1] shadow-[inset_0_0_50px_rgba(0,0,0,0.8)] ${(isMyTurn && gameState?.turnState === 'drawing') ? 'cursor-crosshair' : 'cursor-default'}`}>
                
                {/* Word Selection Overlay */}
                {gameState?.turnState === 'selecting' && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-md">
                    {isMyTurn ? (
                      <div className="text-center animate-pop-in">
                        <h3 className="text-2xl font-bold tracking-widest uppercase text-gray-300 mb-8">Choose your word</h3>
                        <div className="flex gap-4 justify-center">
                          {gameState.wordOptions.map(w => (
                            <button key={w} onClick={() => selectWord(w)} className="btn-secondary hover:bg-white hover:text-black py-4 px-8 text-lg rounded-2xl transition-all">
                              {w}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center animate-pulse text-gray-400 font-light tracking-widest uppercase">
                        The Drawer is picking a word...
                      </div>
                    )}
                  </div>
                )}

                <canvas 
                    ref={canvasRef} 
                    width={800} 
                    height={600} 
                    className="w-full h-full relative z-10 touch-none" 
                    onMouseDown={onMouseDown} 
                    onMouseMove={onMouseMove} 
                    onMouseUp={onMouseUp} 
                    onMouseOut={onMouseUp}
                    onTouchStart={onMouseDown} 
                    onTouchMove={onMouseMove} 
                    onTouchEnd={onMouseUp} 
                    />
                    
              </div>
              
              {/* Leaderboard */}
              <div className="flex flex-wrap gap-4 mt-4">
                {sortedPlayers.map((player, index) => {
                  const isDrawer = player.id === gameState?.drawerId;
                  const hasGuessed = gameState?.guessedPlayers?.includes(player.id);
                  return (
                    <div key={player.id} className={`flex items-center gap-3 px-4 py-2 rounded-xl bg-[#111] border transition-all ${isDrawer ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : hasGuessed ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-white/[0.05]'}`}>
                      <div className="text-gray-600 font-bold w-4">{index + 1}</div>
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-gray-300">
                          {player.name} {isDrawer && '✏️'} {hasGuessed && '✔️'}
                        </span>
                        <span className="text-xs text-gray-500 font-mono">{player.score} pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* CHAT / GUESS PANEL */}
        <div className="lg:w-80">
          <ChatPanel messages={room.chat ?? []} onSend={handleChat} disabled={!room || isMyTurn || gameState?.guessedPlayers?.includes(myPlayerId)} />
        </div>
      </div>
    </div>
  );
}