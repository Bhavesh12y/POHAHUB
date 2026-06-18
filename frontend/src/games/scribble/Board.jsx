import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby';

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
    <div className="glass-card flex flex-col h-full bg-[#0a0a0c]/80 border-white/[0.05] rounded-2xl overflow-hidden min-h-[300px] lg:min-h-[400px]">
      <div className="px-4 py-3 sm:py-4 border-b border-white/[0.05] font-bold tracking-widest text-xs uppercase text-gray-400">
        Guesses & Chat
      </div>
        <div ref={listRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 text-sm scrollbar-thin scrollbar-thumb-gray-800">
                {messages.map((msg) => (
                <div key={msg.id} className={`break-words ${msg.playerId === 'SYSTEM' ? 'text-center my-2' : ''}`}>
                    {/* Only show the Player Name and colon if it's NOT a system message */}
                    {msg.playerId !== 'SYSTEM' && (
                    <span className="font-semibold text-gray-300">{msg.playerName}: </span>
                    )}
                    
                    {/* Style the text differently if it's a System message, a Winner message, or regular chat */}
                    <span className={
                    msg.playerId === 'SYSTEM' ? 'text-gray-500 italic text-[11px] uppercase tracking-wider' :
                    msg.message.includes('🎉') ? 'text-emerald-400 font-bold tracking-wide' : 
                    'text-gray-400 font-light'
                    }>
                    {msg.message}
                    </span>
                </div>
                ))}
      </div>
      <form onSubmit={handleSubmit} className="p-2 sm:p-3 border-t border-white/[0.05] flex gap-2">
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

// --- HIGH PERFORMANCE FLOOD FILL ALGORITHM ---
const performFloodFill = (ctx, startX, startY, fillColorHex) => {
  const canvasWidth = ctx.canvas.width;
  const canvasHeight = ctx.canvas.height;
  
  // Ensure coordinates are within bounds
  if (startX < 0 || startX >= canvasWidth || startY < 0 || startY >= canvasHeight) return;

  const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const data = imageData.data;

  const startPos = (startY * canvasWidth + startX) * 4;
  const startR = data[startPos];
  const startG = data[startPos + 1];
  const startB = data[startPos + 2];
  const startA = data[startPos + 3];

  // Convert Hex to RGB
  const fillR = parseInt(fillColorHex.slice(1, 3), 16);
  const fillG = parseInt(fillColorHex.slice(3, 5), 16);
  const fillB = parseInt(fillColorHex.slice(5, 7), 16);
  const fillA = 255;

  // If the target color is the exact same as the start color, stop to prevent infinite loops
  if (startR === fillR && startG === fillG && startB === fillB && startA === fillA) return;

  const matchStartColor = (pos) => {
    return data[pos] === startR && data[pos + 1] === startG && data[pos + 2] === startB && data[pos + 3] === startA;
  };

  const colorPixel = (pos) => {
    data[pos] = fillR;
    data[pos + 1] = fillG;
    data[pos + 2] = fillB;
    data[pos + 3] = fillA;
  };

  // Stack-based approach (much faster and avoids Maximum Call Stack Size errors vs recursion)
  const stack = [startX, startY];

  while (stack.length > 0) {
    const y = stack.pop();
    const x = stack.pop();
    const pos = (y * canvasWidth + x) * 4;

    if (matchStartColor(pos)) {
      colorPixel(pos);
      if (x + 1 < canvasWidth) { stack.push(x + 1, y); }
      if (x - 1 >= 0) { stack.push(x - 1, y); }
      if (y + 1 < canvasHeight) { stack.push(x, y + 1); }
      if (y - 1 >= 0) { stack.push(x, y - 1); }
    }
  }

  ctx.putImageData(imageData, 0, 0);
};


export default function ScribbleBoard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [room, setRoom] = useState(location.state?.room ?? null);
  const [timeLeft, setTimeLeft] = useState(0);
  
  // Drawing & Tool State
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [color, setColor] = useState('#ffffff');
  const [brushSize, setBrushSize] = useState(5);
  const [activeTool, setActiveTool] = useState('brush'); // 'brush' or 'fill'

  const gameState = room?.gameState;
  const myPlayerId = room?.viewerId;
  const isMyTurn = gameState?.drawerId === myPlayerId;
  const isHost = room?.hostId === myPlayerId;

  // Added background color (#0a0a0c) as the last option for "Erase"
  const COLORS = ['#ffffff', '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#a855f7', '#0a0a0c'];

  useEffect(() => {
    const socket = connectSocket();
    const username = sessionStorage.getItem('pohahub_username');
    if (!username) {
      navigate(`/games/scribble?join=${roomCode}`);
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

    // Drawing Sync Listeners
    socket.on('draw:line', ({ x0, y0, x1, y1, color, size }) => drawLine(x0, y0, x1, y1, color, size, false));
    // Inside your useEffect where you listen for socket events:
        socket.on('draw:fill', ({ color }) => {
            const canvas = canvasRef.current;
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = color;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        });

    socket.on('draw:clear', () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, 800, 600);
    });

    if (socket.connected) syncRoom();
    else socket.connect();

    return () => {
      socket.off('connect'); socket.off('room:update'); socket.off('chat:message');
      socket.off('draw:line'); socket.off('draw:fill'); socket.off('draw:clear');
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

  // --- CANVAS INTERACTION LOGIC ---
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
    
    const curPos = getMousePos(e);

    // If bucket fill is selected
    if (activeTool === 'fill') {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        const rx = Math.round(curPos.x);
        const ry = Math.round(curPos.y);
        performFloodFill(ctx, rx, ry, color);
        emitWithAck('draw:fill', { x: rx, y: ry, color });
      }
      return;
    }

    // If brush is selected
    isDrawing.current = true; 
    lastPos.current = curPos;
  };

  const onMouseMove = (e) => {
    if (!isDrawing.current || activeTool !== 'brush') return;
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

  const sortedPlayers = [...(gameState?.players || [])].sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-8 relative">
      
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
          <div className="relative w-full max-w-md glass-card bg-[#0a0a0c] border border-white/[0.1] shadow-[0_0_50px_rgba(255,255,255,0.05)] p-6 sm:p-10 text-center animate-pop-in rounded-3xl">
            <div className="text-[10px] sm:text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-4">Match Concluded</div>
            <h2 className="text-4xl sm:text-5xl font-extrabold mb-2 text-shimmer tracking-tighter drop-shadow-2xl">{gameState.winner?.name}</h2>
            <h3 className="text-lg sm:text-xl font-light text-gray-300 mb-2 tracking-wide">is the Grand Artist!</h3>
            <p className="text-gray-500 mb-8 font-mono">{gameState.winner?.score} points</p>
            <Link to="/games/scribble" className="btn-primary w-full block py-4 text-sm font-bold uppercase rounded-xl">Return to Hub</Link>
          </div>
        </div>
      )}

      {/* RESPONSIVE TOP STATUS BAR */}
      <div className="glass-card bg-[#0a0a0c]/80 border-white/[0.05] p-4 sm:p-6 mb-4 sm:mb-6 grid grid-cols-2 md:flex md:flex-row justify-between items-center rounded-2xl gap-3 sm:gap-4 relative overflow-hidden">
        {gameState?.turnState === 'drawing' && (
           <div className="absolute top-0 left-0 h-1 bg-gradient-to-r from-emerald-400 to-rose-500 transition-all duration-500 ease-linear" 
                style={{ width: `${(timeLeft / gameState.timeLimit) * 100}%` }} />
        )}

        <div className="order-2 md:order-1 col-span-1 text-left">
          <p className="text-[9px] sm:text-xs font-bold tracking-[0.2em] uppercase text-gray-600">Round {gameState?.round || 1}/{gameState?.maxRounds || 3}</p>
          <p className="text-base sm:text-xl font-mono font-bold text-gray-200">
            {gameState?.turnState === 'drawing' ? `⏳ ${timeLeft}s` : 'Waiting'}
          </p>
        </div>
        
        <div className="order-1 md:order-2 col-span-2 md:col-span-1 text-center bg-white/[0.02] md:bg-transparent rounded-xl py-2 md:py-0">
          <p className="text-[9px] sm:text-xs font-bold tracking-[0.2em] uppercase text-gray-600 mb-1">Word</p>
          <p className="text-xl sm:text-2xl font-medium tracking-[0.2em] sm:tracking-[0.3em] text-white drop-shadow-[0_0_10px_rgba(255,255,255,0.3)] min-h-[32px]">
            {gameState?.currentWord || "_ _ _ _ _"}
          </p>
        </div>

        <div className="order-3 md:order-3 col-span-1 text-right">
          <p className="text-[9px] sm:text-xs font-bold tracking-[0.2em] uppercase text-gray-600">Status</p>
          <p className="text-xs sm:text-sm md:text-base font-medium text-gray-300">
            {room.status === 'waiting' ? 'Waiting...' : gameState?.turnState === 'selecting' ? 'Picking...' : isMyTurn ? "Draw!" : "Guess!"}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
        <div className="flex-1 flex flex-col gap-3 sm:gap-4">
          
          {room.status === 'waiting' ? (
             <WaitingLobby 
      roomCode={room.code} 
      isHost={isHost} 
      playerCount={room.players.length} 
      onStart={handleStart} 
      gamePath="scribble" 
  />
          ) : (
            <>
              {/* RESPONSIVE TOOLS PANEL */}
              {/* Professional Tool Panel */}
            <div className={`flex flex-col md:flex-row justify-between items-center p-3 sm:p-4 glass-card bg-[#111] border-white/[0.05] rounded-2xl gap-3 transition-opacity ${(!isMyTurn || gameState?.turnState !== 'drawing') && 'opacity-50 pointer-events-none'}`}>
            
            {/* Tool Toggles */}
            <div className="flex bg-[#0a0a0c] p-1 rounded-xl border border-white/[0.05]">
                <button onClick={() => setActiveTool('brush')} className={`px-4 py-1.5 rounded-lg text-sm transition-all ${activeTool === 'brush' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>✏️ Brush</button>
                <button onClick={() => setActiveTool('fill')} className={`px-4 py-1.5 rounded-lg text-sm transition-all ${activeTool === 'fill' ? 'bg-white/10 text-white' : 'text-gray-500'}`}>🪣 Fill</button>
            </div>

            {/* Colors - Grid View */}
                <div className="flex items-center gap-4 bg-[#0a0a0c] p-2 rounded-xl border border-white/[0.05]">
                  {/* The 2x5 Grid */}
                  <div className="grid grid-cols-5 gap-1.5">
                    {COLORS.slice(0, 10).map(c => (
                      <button 
                        key={c} 
                        onClick={() => setColor(c)} 
                        className={`w-6 h-6 rounded-md border ${color === c ? 'border-white scale-110 shadow-lg' : 'border-white/10'}`} 
                        style={{ backgroundColor: c }} 
                      />
                    ))}
                  </div>

                  {/* Advanced Dropper Icon */}
                  <div className="relative group border-l border-white/10 pl-3">
                    <label className="cursor-pointer flex flex-col items-center">
                      <span className="text-lg">💧</span>
                      <input 
                        type="color" 
                        value={color} 
                        onChange={(e) => setColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

            <button onClick={clearCanvas} className="text-xs font-bold uppercase tracking-widest text-red-400 hover:text-red-300">Clear</button>
</div>

              {/* THE CANVAS */}
              <div className={`relative w-full aspect-[4/3] sm:aspect-video rounded-2xl sm:rounded-3xl overflow-hidden bg-[#0a0a0c] border border-white/[0.1] shadow-[inset_0_0_30px_rgba(0,0,0,0.8)] ${(isMyTurn && gameState?.turnState === 'drawing') ? (activeTool === 'fill' ? 'cursor-cell' : 'cursor-crosshair') : 'cursor-default'}`}>
                
                {gameState?.turnState === 'selecting' && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
                    {isMyTurn ? (
                      <div className="text-center animate-pop-in w-full">
                        <h3 className="text-lg sm:text-2xl font-bold tracking-widest uppercase text-gray-300 mb-6 sm:mb-8">Choose your word</h3>
                        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
                          {gameState.wordOptions.map(w => (
                            <button key={w} onClick={() => selectWord(w)} className="btn-secondary hover:bg-white hover:text-black py-3 sm:py-4 px-6 sm:px-8 text-sm sm:text-lg rounded-2xl transition-all">
                              {w}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center animate-pulse text-gray-400 font-light tracking-widest uppercase text-xs sm:text-sm">
                        The Drawer is picking a word...
                      </div>
                    )}
                  </div>
                )}

                {/* touch-none added to prevent scrolling */}
                <canvas ref={canvasRef} width={800} height={600} className="w-full h-full relative z-10 touch-none"
                  onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseOut={onMouseUp}
                  onTouchStart={onMouseDown} onTouchMove={onMouseMove} onTouchEnd={onMouseUp} />
              </div>
              
              {/* RESPONSIVE LEADERBOARD */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-4">
                {sortedPlayers.map((player, index) => {
                  const isDrawer = player.id === gameState?.drawerId;
                  const hasGuessed = gameState?.guessedPlayers?.includes(player.id);
                  return (
                    <div key={player.id} className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-xl bg-[#111] border transition-all ${isDrawer ? 'border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : hasGuessed ? 'border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.1)]' : 'border-white/[0.05]'}`}>
                      <div className="text-gray-600 font-bold text-xs sm:text-sm w-3 sm:w-4">{index + 1}</div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] sm:text-sm font-medium text-gray-300 truncate">
                          {player.name} {isDrawer && '✏️'} {hasGuessed && '✔️'}
                        </span>
                        <span className="text-[9px] sm:text-xs text-gray-500 font-mono">{player.score} pts</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* CHAT / GUESS PANEL */}
        <div className="lg:w-80 h-[300px] lg:h-auto mt-4 lg:mt-0">
            <ChatPanel 
                messages={room.chat ?? []} 
                onSend={handleChat} 
                disabled={!room} 
            />
            </div>
      </div>
    </div>
  );
}