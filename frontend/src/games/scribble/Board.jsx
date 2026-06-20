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
    <div className="flex flex-col h-full bg-[#333333] border-[3px] border-black rounded-lg shadow-[6px_6px_0px_#000] rotate-1 text-white min-h-[300px] lg:min-h-[400px]">
      <div className="px-4 py-3 sm:py-4 border-b-[3px] border-black font-bold tracking-widest text-xs uppercase text-gray-200 bg-[#222]">
        Guesses & Chat
      </div>
        <div ref={listRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 text-sm scrollbar-thin scrollbar-thumb-gray-600 bg-[#333]">
                {messages.map((msg) => (
                <div key={msg.id} className={`break-words ${msg.playerId === 'SYSTEM' ? 'text-center my-3 bg-[#facc15] border-[2px] border-black rounded p-2 shadow-[2px_2px_0px_#000]' : ''}`}>
                    {/* Only show the Player Name and colon if it's NOT a system message */}
                    {msg.playerId !== 'SYSTEM' && (
                    <span className="font-bold text-[#facc15]">{msg.playerName}: </span>
                    )}
                    
                    {/* Style the text differently if it's a System message, a Winner message, or regular chat */}
                    <span className={
                    msg.playerId === 'SYSTEM' ? 'text-black font-bold text-[11px] uppercase tracking-widest' :
                    msg.message.includes('🎉') ? 'text-[#10b981] font-black tracking-wide' : 
                    'text-gray-100 font-medium'
                    }>
                    {msg.message}
                    </span>
                </div>
                ))}
      </div>
      <form onSubmit={handleSubmit} className="p-2 sm:p-3 border-t-[3px] border-black flex gap-2 bg-[#2a2a2a] rounded-b-lg">
        <input
          type="text"
          className="py-2 px-3 text-sm flex-1 bg-black border-[2px] border-black rounded text-white focus:outline-none focus:ring-2 focus:ring-[#facc15]"
          placeholder="Guess..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
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
  const [color, setColor] = useState('#000000'); // Default to Black for white canvas
  const [brushSize, setBrushSize] = useState(5);
  const [activeTool, setActiveTool] = useState('brush'); // 'brush' or 'fill'

  const gameState = room?.gameState;
  const myPlayerId = room?.viewerId;
  const isMyTurn = gameState?.drawerId === myPlayerId;
  const isHost = room?.hostId === myPlayerId;

  // Swapped to neo-brutalist palette: Black is first, White is last (Eraser)
  const COLORS = ['#000000', '#ef4444', '#facc15', '#10b981', '#3b82f6', '#a855f7', '#ffffff'];

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
    socket.on('draw:fill', ({ color }) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    });

    socket.on('draw:clear', () => {
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, 800, 600); // Clears to transparent (revealing white bg)
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

  if (!room) return (
    <div className="text-center py-24 text-black font-bold uppercase tracking-widest animate-pulse">
        Connecting to the server...
    </div>
  );

  const sortedPlayers = [...(gameState?.players || [])].sort((a, b) => b.score - a.score);

  return (
    <div className="max-w-6xl mx-auto px-2 sm:px-4 py-4 sm:py-8 relative font-sans">
      
      {/* POPUP & CUSTOM CURSOR CSS */}
      <style>{`
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.8) translateY(30px) rotate(-5deg); } 100% { opacity: 1; transform: scale(1) translateY(0) rotate(-2deg); } }
        .animate-pop-in { animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        
        /* High Contrast Custom Cursor for Drawing */
        .custom-cursor-brush {
            cursor: url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 2v20M2 12h20' stroke='%23ffffff' stroke-width='6' stroke-linecap='round'/%3E%3Cpath d='M12 2v20M2 12h20' stroke='%23000000' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") 12 12, crosshair !important;
        }
      `}</style>

      {/* WINNER POPUP */}
      {(gameState?.status === 'won') && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white border-[4px] border-black shadow-[12px_12px_0px_#000] p-6 sm:p-10 text-center animate-pop-in rounded-xl -rotate-2">
            <div className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-4">Match Concluded</div>
            <h2 className="text-4xl sm:text-5xl font-black mb-2 text-[#ef4444] tracking-tighter uppercase" style={{ WebkitTextStroke: '2px black' }}>
                {gameState.winner?.name}
            </h2>
            <h3 className="text-lg sm:text-xl font-bold text-black mb-2 uppercase">is the Grand Artist!</h3>
            <div className="w-full h-[3px] bg-black my-6" />
            <p className="text-black text-xl font-bold mb-8">{gameState.winner?.score} points</p>
            <Link 
              to="/games/scribble" 
              className="bg-[#facc15] w-full block py-4 text-sm font-black tracking-widest uppercase border-[3px] border-black shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] text-black transition-all duration-150 rounded"
            >
              Return to Hub
            </Link>
          </div>
        </div>
      )}

      {/* RESPONSIVE TOP STATUS BAR */}
      <div className="bg-[#333333] border-[3px] border-black p-4 sm:p-6 mb-4 sm:mb-6 grid grid-cols-2 md:flex md:flex-row justify-between items-center rounded-lg shadow-[8px_8px_0px_#000] gap-3 sm:gap-4 relative overflow-hidden -rotate-1">
        
        {/* Timer Bar */}
        {gameState?.turnState === 'drawing' && (
           <div className="absolute top-0 left-0 h-2 bg-[#facc15] border-b-[3px] border-black transition-all duration-500 ease-linear" 
                style={{ width: `${(timeLeft / gameState.timeLimit) * 100}%` }} />
        )}

        <div className="order-2 md:order-1 col-span-1 text-left mt-2 md:mt-0">
          <p className="text-[9px] sm:text-xs font-bold tracking-[0.2em] uppercase text-gray-400">Round {gameState?.round || 1}/{gameState?.maxRounds || 3}</p>
          <p className="text-base sm:text-2xl font-black text-white">
            {gameState?.turnState === 'drawing' ? `⏳ ${timeLeft}s` : 'Waiting'}
          </p>
        </div>
        
        <div className="order-1 md:order-2 col-span-2 md:col-span-1 text-center bg-[#222] border-[3px] border-black shadow-[inset_3px_3px_0px_rgba(0,0,0,0.5)] md:bg-transparent md:border-none md:shadow-none rounded-lg py-3 md:py-0 mt-2 md:mt-0">
          <p className="text-[9px] sm:text-xs font-bold tracking-[0.2em] uppercase text-gray-400 mb-1">Word</p>
          <p className="text-xl sm:text-3xl font-black tracking-widest text-[#facc15] min-h-[32px] uppercase">
            {gameState?.currentWord || "_ _ _ _ _"}
          </p>
        </div>

        <div className="order-3 md:order-3 col-span-1 text-right mt-2 md:mt-0">
          <p className="text-[9px] sm:text-xs font-bold tracking-[0.2em] uppercase text-gray-400">Status</p>
          <p className="text-xs sm:text-lg font-bold text-white uppercase">
            {room.status === 'waiting' ? 'Waiting...' : gameState?.turnState === 'selecting' ? 'Picking...' : isMyTurn ? "Draw!" : "Guess!"}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-4">
          
          {room.status === 'waiting' ? (
             <WaitingLobby 
                roomCode={room.code} 
                isHost={isHost} 
                playerCount={room.players.length} 
                onStart={handleStart} 
                gamePath="scribble/room" 
             />
          ) : (
            <>
              {/* RESPONSIVE TOOLS PANEL */}
              <div className={`flex flex-col md:flex-row justify-between items-center p-3 sm:p-4 bg-white border-[3px] border-black rounded-lg shadow-[6px_6px_0px_#000] gap-3 transition-opacity ${(!isMyTurn || gameState?.turnState !== 'drawing') && 'opacity-50 pointer-events-none'}`}>
            
                {/* Tool Toggles */}
                <div className="flex bg-gray-200 p-1 rounded border-[3px] border-black">
                    <button 
                        onClick={() => setActiveTool('brush')} 
                        className={`px-4 py-1.5 rounded text-sm font-bold border-[2px] transition-all ${activeTool === 'brush' ? 'bg-[#facc15] border-black shadow-[2px_2px_0px_#000]' : 'bg-transparent border-transparent text-gray-600 hover:bg-gray-300'}`}
                    >
                        ✏️ Brush
                    </button>
                    <button 
                        onClick={() => setActiveTool('fill')} 
                        className={`px-4 py-1.5 rounded text-sm font-bold border-[2px] transition-all ${activeTool === 'fill' ? 'bg-[#facc15] border-black shadow-[2px_2px_0px_#000]' : 'bg-transparent border-transparent text-gray-600 hover:bg-gray-300'}`}
                    >
                        🪣 Fill
                    </button>
                </div>

                {/* Colors - Grid View */}
                <div className="flex items-center gap-4 bg-gray-200 p-2 rounded border-[3px] border-black">
                    <div className="grid grid-cols-7 gap-2">
                    {COLORS.slice(0, 7).map(c => (
                        <button 
                        key={c} 
                        onClick={() => setColor(c)} 
                        className={`w-6 h-6 rounded border-[2px] border-black transition-all ${color === c ? 'scale-125 shadow-[2px_2px_0px_#000] z-10' : 'hover:scale-110'}`} 
                        style={{ backgroundColor: c }} 
                        title={c === '#ffffff' ? 'Eraser' : 'Color'}
                        />
                    ))}
                    </div>

                    {/* Advanced Dropper Icon */}
                    <div className="relative group border-l-[3px] border-black pl-3 flex items-center justify-center">
                    <label className="cursor-pointer flex flex-col items-center">
                        <span className="text-xl hover:scale-110 transition-transform">💧</span>
                        <input 
                        type="color" 
                        value={color} 
                        onChange={(e) => setColor(e.target.value)}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                    </label>
                    </div>
                </div>

                <button 
                    onClick={clearCanvas} 
                    className="bg-[#ef4444] text-white border-[3px] border-black px-4 py-2 rounded font-bold uppercase shadow-[3px_3px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_#000] transition-all"
                >
                    Clear
                </button>
              </div>

              {/* THE CANVAS */}
              <div className={`relative w-full aspect-[4/3] sm:aspect-video rounded-lg overflow-hidden bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] rotate-1`}>
                
                {gameState?.turnState === 'selecting' && (
                  <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    {isMyTurn ? (
                      <div className="text-center animate-pop-in w-full max-w-lg bg-white border-[4px] border-black p-8 rounded-xl shadow-[12px_12px_0px_#000] -rotate-2">
                        <h3 className="text-xl sm:text-3xl font-black uppercase text-black mb-6 sm:mb-8">Choose your word</h3>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                          {gameState.wordOptions.map(w => (
                            <button 
                                key={w} 
                                onClick={() => selectWord(w)} 
                                className="bg-[#3b82f6] text-white hover:bg-[#facc15] hover:text-black py-3 sm:py-4 px-6 sm:px-8 text-sm sm:text-lg rounded font-bold uppercase border-[3px] border-black shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all"
                            >
                              {w}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center bg-white border-[3px] border-black p-6 rounded-lg shadow-[6px_6px_0px_#000] animate-pulse text-black font-bold uppercase text-sm sm:text-xl">
                        The Drawer is picking a word...
                      </div>
                    )}
                  </div>
                )}

                {/* THE FIX: Replaced custom-crosshair logic with the new custom-cursor-brush class */}
                <canvas ref={canvasRef} width={800} height={600} 
                  className={`w-full h-full relative z-10 touch-none ${(isMyTurn && gameState?.turnState === 'drawing') ? (activeTool === 'fill' ? 'cursor-cell' : 'custom-cursor-brush') : 'cursor-default'}`}
                  onMouseDown={onMouseDown} onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseOut={onMouseUp}
                  onTouchStart={onMouseDown} onTouchMove={onMouseMove} onTouchEnd={onMouseUp} />
              </div>
              
              {/* RESPONSIVE LEADERBOARD */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 mt-2">
                {sortedPlayers.map((player, index) => {
                  const isDrawer = player.id === gameState?.drawerId;
                  const hasGuessed = gameState?.guessedPlayers?.includes(player.id);
                  return (
                    <div 
                        key={player.id} 
                        className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-lg border-[3px] border-black transition-all ${
                            isDrawer ? 'bg-[#3b82f6] text-white shadow-[4px_4px_0px_#000]' : 
                            hasGuessed ? 'bg-[#10b981] text-black shadow-[4px_4px_0px_#000]' : 
                            'bg-white text-black shadow-[3px_3px_0px_#000]'
                        }`}
                    >
                      <div className="font-black text-lg w-3 sm:w-4">{index + 1}</div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[11px] sm:text-sm font-bold truncate">
                          {player.name} {isDrawer && '✏️'} {hasGuessed && '✔️'}
                        </span>
                        <span className={`text-[10px] sm:text-xs font-bold ${isDrawer ? 'text-blue-200' : 'text-gray-600'}`}>
                          {player.score ?? 0} pts
                        </span>
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
                messages={room?.chat ?? []} 
                onSend={handleChat} 
                disabled={!room} 
            />
        </div>
      </div>
    </div>
  );
}