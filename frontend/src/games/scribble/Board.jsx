import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby';
import VoiceChat from '../../components/VoiceChat';

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
    <div className="flex flex-col w-full h-[400px] lg:h-[550px] shrink-0 bg-[#333333] border-[3px] border-black rounded-lg shadow-[6px_6px_0px_#000] rotate-1 text-white">
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
  
  if (startX < 0 || startX >= canvasWidth || startY < 0 || startY >= canvasHeight) return;

  const imageData = ctx.getImageData(0, 0, canvasWidth, canvasHeight);
  const data = imageData.data;

  const startPos = (startY * canvasWidth + startX) * 4;
  const startR = data[startPos];
  const startG = data[startPos + 1];
  const startB = data[startPos + 2];
  const startA = data[startPos + 3];

  const fillR = parseInt(fillColorHex.slice(1, 3), 16);
  const fillG = parseInt(fillColorHex.slice(3, 5), 16);
  const fillB = parseInt(fillColorHex.slice(5, 7), 16);
  const fillA = 255;

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
  
  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });
  const [color, setColor] = useState('#000000'); 
  const [brushSize, setBrushSize] = useState(5);
  const [activeTool, setActiveTool] = useState('brush'); 

  const gameState = room?.gameState;
  const myPlayerId = room?.viewerId;
  const isMyTurn = gameState?.drawerId === myPlayerId;
  const isHost = room?.hostId === myPlayerId;

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
      if (ctx) ctx.clearRect(0, 0, 800, 600); 
    });

    if (socket.connected) syncRoom();
    else socket.connect();

    return () => {
      socket.off('connect'); socket.off('room:update'); socket.off('chat:message');
      socket.off('draw:line'); socket.off('draw:fill'); socket.off('draw:clear');
    };
  }, [roomCode, navigate]);

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
      
      <style>{`
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.8) translateY(30px) rotate(-5deg); } 100% { opacity: 1; transform: scale(1) translateY(0) rotate(-2deg); } }
        .animate-pop-in { animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
        
        .custom-cursor-brush {
            cursor: url("data:image/svg+xml,%3Csvg width='24' height='24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M12 2v20M2 12h20' stroke='%23ffffff' stroke-width='6' stroke-linecap='round'/%3E%3Cpath d='M12 2v20M2 12h20' stroke='%23000000' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") 12 12, crosshair !important;
        }
      `}</style>

      {(gameState?.status === 'won') && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white border-[4px] border-black shadow-[12px_12px_0px_#000] p-6 sm:p-10 text-center animate-pop-in rounded-xl -rotate-2">
            <div className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-4">Match Concluded</div>
            <h2 className="text-[clamp(1.5rem,5vw,3rem)] font-black mb-2 text-[#ef4444] tracking-tighter uppercase" style={{ WebkitTextStroke: '2px black' }}>
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

      <div className="flex flex-col lg:flex-row gap-6">
        
       {/* LEFT COLUMN: Drawing Interface */}
<div className="flex-1 flex flex-col gap-4">
  
  {/* --- STICKY MOBILE WRAPPER --- */}
  {/* This locks the canvas to the top on mobile so you can see it while typing in chat */}
  <div className="sticky top-0 z-40 bg-white pt-2 pb-4 -mx-2 px-2 sm:mx-0 sm:px-0 sm:bg-transparent sm:pt-0 sm:pb-0 sm:relative sm:z-auto">
    
    {/* 1. YOUR RESPONSIVE TOP STATUS BAR */}
    <div className="bg-[#333333] border-[3px] border-black p-4 sm:p-6 mb-4 sm:mb-6 grid ...">
      {/* ... timer, word, and status code ... */}
    </div>

    {/* 2. YOUR CONDITIONAL TOOLS PANEL */}
    {(isMyTurn && gameState?.turnState === 'drawing') && (
      <div className="flex flex-col md:flex-row justify-between items-center p-3 sm:p-4 mb-4 ...">
        {/* ... brush, fill, colors, clear code ... */}
      </div>
    )}

    {/* 3. YOUR CANVAS */}
    <div className={`relative w-full aspect-[4/3] sm:aspect-video rounded-lg overflow-hidden ...`}>
      {/* ... word selection and canvas code ... */}
    </div>

  </div> 
  {/* --- END OF STICKY WRAPPER --- */}

  {/* LEADERBOARD (Outside the sticky wrapper so it can scroll) */}
  {room.status !== 'waiting' && (
    <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:gap-4 mt-2">
      {/* ... players map code ... */}
    </div>
  )}

</div>

{/* RIGHT COLUMN: Chat / Guess Panel (Outside so it scrolls underneath the sticky canvas) */}
{room.status !== 'waiting' && (
    <div className="lg:w-80 h-[300px] lg:h-auto mt-4 lg:mt-0">
        <ChatPanel 
            messages={room?.chat ?? []} 
            onSend={handleChat} 
            disabled={!room} 
        />
    </div>
)}
      </div>
    </div>
  );
}