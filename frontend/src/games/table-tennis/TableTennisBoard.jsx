import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby';
import VoiceChat from '../../components/VoiceChat';

const GAME_WIDTH = 1000;
const GAME_HEIGHT = 600;
const BALL_RADIUS = 12;
const RACKET_RADIUS = 40;

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
    <div className="flex flex-col w-full h-[400px] lg:h-[550px] shrink-0 bg-[#333333] border-[3px] border-black rounded-lg shadow-[6px_6px_0px_#000] rotate-1 text-white">
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

export default function TableTennisBoard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const canvasRef = useRef(null);
  
  const [room, setRoom] = useState(location.state?.room ?? null);
  const [error, setError] = useState('');
  const [connected, setConnected] = useState(false);

  const [gameState, setGameState] = useState(null);
  const [myRole, setMyRole] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const socket = connectSocket();
  const username = localStorage.getItem('pohahub_username');
  const myPlayerId = socket.id;
  const isHost = room?.hostId === myPlayerId;

  // Track ball trail
  const trailRef = useRef([]);

  // FIX: Added Refs for accurate touch delta tracking and network throttling
  const dragOriginRef = useRef({ x: 0, y: 0 });
  const paddleOriginRef = useRef({ x: 0, y: 0 });
  const lastMoveEmit = useRef(0);

  useEffect(() => {
    if (!username) {
      navigate(`/games/table-tennis?join=${roomCode}`);
      return;
    }

    const syncRoom = async () => {
      const result = await emitWithAck('room:join', {
        roomCode: roomCode.toUpperCase(),
        playerName: username,
      });
      if (result.ok) setRoom(result.room);
      else setError(result.error || 'Could not join room');
    };

    const onConnect = () => {
      setConnected(true);
      syncRoom();
    };
    const onDisconnect = () => setConnected(false);
    const onRoomUpdate = (updatedRoom) => {
      if (updatedRoom.code === roomCode?.toUpperCase()) setRoom(updatedRoom);
    };
    const onChatMessage = (msg) => {
      setRoom((prev) => prev ? { ...prev, chat: [...(prev.chat ?? []), msg] } : prev);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:update', onRoomUpdate);
    socket.on('chat:message', onChatMessage);

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
    };
  }, [roomCode, navigate, username, socket]);

  useEffect(() => {
    if (room?.status !== 'playing') return;

    socket.emit('tt:join', { roomId: roomCode.toUpperCase(), playerInfo: { id: myPlayerId, name: username } });

    socket.on('tt:role', ({ role }) => setMyRole(role));
    socket.on('tt:gameState', (state) => {
      setGameState(state);
      if (state.ball) {
        trailRef.current.push({ x: state.ball.x, y: state.ball.y });
        if (trailRef.current.length > 8) trailRef.current.shift();
      }
    });
    socket.on('tt:countdown', (count) => {
      setCountdown(count);
      trailRef.current = []; 
    });
    
    return () => {
      socket.off('tt:role');
      socket.off('tt:gameState');
      socket.off('tt:countdown');
    };
  }, [room?.status, roomCode, myPlayerId, username, socket]);

  const handleStart = async () => {
    setError('');
    const result = await emitWithAck('room:start', {});
    if (!result.ok) setError(result.error);
  };

  const handleChat = async (message) => {
    await emitWithAck('chat:message', { message });
  };

  const handleRematch = async () => {
    const result = await emitWithAck('game:reset', {});
    if (result.ok) {
      socket.emit('tt:rematch', roomCode.toUpperCase());
    }
  };

  // ──────────────────────────────────────────
  // FIX: RELATIVE DELTA CONTROLS & THROTTLING
  // ──────────────────────────────────────────
  const handlePointerDown = (e) => {
    if (gameState?.status !== 'playing' || !canvasRef.current || !myRole) return;
    setIsDragging(true);
    try { e.target.setPointerCapture(e.pointerId); } catch (err) {}

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;

    const clientX = e.clientX ?? (e.touches?.[0]?.clientX);
    const clientY = e.clientY ?? (e.touches?.[0]?.clientY);
    
    // Lock in where the finger first touched the screen
    dragOriginRef.current = {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };

    // Lock in where the paddle was when the touch started
    const currentPaddle = gameState.paddles[myRole];
    paddleOriginRef.current = { x: currentPaddle.x, y: currentPaddle.y };
  };

  const handlePointerMove = (e) => {
    if (!isDragging || gameState?.status !== 'playing' || !canvasRef.current || !myRole) return;
    
    // THROTTLE: Stop network flooding (limit to ~60 updates/sec)
    const now = Date.now();
    if (now - lastMoveEmit.current < 16) return;
    lastMoveEmit.current = now;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;

    const clientX = e.clientX ?? (e.touches?.[0]?.clientX);
    const clientY = e.clientY ?? (e.touches?.[0]?.clientY);
    if (clientX === undefined || clientY === undefined) return;

    const currentX = (clientX - rect.left) * scaleX;
    const currentY = (clientY - rect.top) * scaleY;

    // Calculate how far the finger has dragged relative to the origin
    const deltaX = currentX - dragOriginRef.current.x;
    const deltaY = currentY - dragOriginRef.current.y;

    // Apply that distance to the paddle's origin position
    const newX = paddleOriginRef.current.x + deltaX;
    const newY = paddleOriginRef.current.y + deltaY;

    socket.emit('tt:move', { 
      roomId: roomCode.toUpperCase(), 
      pos: { x: newX, y: newY }
    });
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    try { e.target.releasePointerCapture(e.pointerId); } catch (err) {}
  };

  // ──────────────────────────────────────────
  // CANVAS RENDERING
  // ──────────────────────────────────────────
  useEffect(() => {
    if (!gameState || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(1, '#1e293b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#020617';
    ctx.fillRect(0, h - 20, w, 20);

    ctx.fillStyle = '#1e3a8a'; 
    ctx.fillRect(100, 450, 800, 20);
    ctx.fillStyle = '#3b82f6'; 
    ctx.fillRect(100, 450, 800, 5);
    
    ctx.fillStyle = '#475569';
    ctx.fillRect(150, 470, 15, h - 470 - 20);
    ctx.fillRect(835, 470, 15, h - 470 - 20);

    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(w / 2 - 4, 370, 8, 80);
    ctx.fillStyle = '#f8fafc'; 
    ctx.fillRect(w / 2 - 5, 370, 10, 5);

    ctx.save();
    trailRef.current.forEach((pos, i) => {
      const alpha = (i + 1) / trailRef.current.length;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, BALL_RADIUS * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(250, 204, 21, ${alpha * 0.5})`; 
      ctx.fill();
    });
    ctx.restore();

    ctx.beginPath();
    ctx.arc(gameState.ball.x, gameState.ball.y, BALL_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = '#facc15'; 
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#facc15';
    ctx.fill();
    ctx.shadowBlur = 0; 
    
    const drawRacket = (racket, color, isP1) => {
      ctx.save();
      ctx.translate(racket.x, racket.y);
      ctx.rotate(isP1 ? Math.PI / 6 : -Math.PI / 6); 
      
      ctx.fillStyle = '#b45309'; 
      ctx.fillRect(-6, 0, 12, 50);
      
      ctx.beginPath();
      ctx.arc(0, 0, RACKET_RADIUS, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#000';
      ctx.stroke();
      
      ctx.restore();
    };

    drawRacket(gameState.paddles.p1, '#3b82f6', true);
    drawRacket(gameState.paddles.p2, '#ef4444', false);

  }, [gameState, myRole]);

  const leftPlayer = 'p1';
  const rightPlayer = 'p2';
  
  const getPlayerLabel = (role) => role === myRole ? '⭐ YOU' : 'OPPONENT';
  const leftColor = myRole === 'p1' ? 'text-[#3b82f6]' : 'text-gray-500';
  const rightColor = myRole === 'p2' ? 'text-[#ef4444]' : 'text-gray-500';

  if (!room) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] p-10 rounded-lg max-w-md mx-auto -rotate-1">
          <div className="animate-pulse text-gray-500 font-bold mb-2 tracking-widest uppercase text-sm">Connecting to Table...</div>
          <p className="text-3xl text-black font-black font-mono">{roomCode}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-[clamp(0.5rem,2vw,1.5rem)] py-[clamp(1rem,3vw,2rem)] relative font-sans">
      
      {/* MATCH FINISHED POPUP */}
      {gameState?.status === 'finished' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" />
          <div className="relative w-full max-w-md bg-white border-[4px] border-black shadow-[12px_12px_0px_#000] p-10 text-center animate-pop-in rounded-xl -rotate-2">
            <div className="relative z-10 text-black">
              <div className="text-sm font-bold tracking-widest uppercase text-gray-500 mb-2">Match Concluded</div>
              <h2 className="text-[clamp(2.5rem,5vw,3.5rem)] font-black mb-2 text-[#22d3ee] tracking-tighter uppercase leading-none" style={{ WebkitTextStroke: '2px black' }}>
                {gameState.winner === myRole ? 'You Won!' : 'You Lost'}
              </h2>
              <div className="w-full h-[3px] bg-black my-6" />
              <div className="flex flex-col gap-3">
                {isHost ? (
                  <button 
                    onClick={handleRematch}
                    className="bg-[#4ade80] w-full block py-4 text-sm font-black tracking-widest uppercase border-[3px] border-black shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] text-black transition-all duration-150 rounded"
                  >
                    Play Again
                  </button>
                ) : (
                  <p className="text-gray-600 font-bold uppercase text-sm mb-2">Waiting for host to restart...</p>
                )}
                <Link 
                  to="/games/table-tennis" 
                  className="bg-gray-200 w-full block py-4 text-sm font-bold tracking-widest uppercase border-[3px] border-black shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] text-black text-center transition-all duration-150 rounded"
                >
                  Return to Hub
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN LAYOUT */}
      <div className="flex flex-col lg:flex-row gap-[clamp(1rem,3vw,2rem)] items-stretch">
        
        {/* GAME COLUMN */}
        <div className="flex-1 w-full min-w-0 flex flex-col">
          <div className="bg-[#333333] border-[3px] border-black rounded-lg p-6 sm:p-8 shadow-[8px_8px_0px_#000] -rotate-1 text-white">
            
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border-b-[3px] border-black pb-6">
              <div>
                <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-1">Room Code</p>
                <p className="text-[clamp(1.5rem,4vw,2.25rem)] font-black tracking-widest text-white uppercase">{room.code}</p>
              </div>
              <VoiceChat roomCode={room.code} />
              <div className="text-right">
                <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-1">Status</p>
                <p className="font-black text-[#facc15] text-[clamp(0.8rem,2vw,1rem)] uppercase">
                  {room.status === 'waiting' ? 'Waiting Lobby' : 'Match in Progress'}
                </p>
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
                gamePath="table-tennis/room"
              />
            )}

            {room.status === 'playing' && !gameState && (
              <div className="text-center font-black uppercase text-2xl py-20 animate-pulse text-white">
                Syncing Table...
              </div>
            )}

            {gameState && (
              <div className="w-full mt-4 max-w-[900px] mx-auto">
                
                <div className="flex justify-between items-center bg-white border-[4px] border-black p-4 mb-6 shadow-[8px_8px_0px_#000] rotate-1 text-black">
                  <div className="text-center w-1/3">
                    <p className={`text-sm font-bold uppercase ${leftColor}`}>{getPlayerLabel('p1')}</p>
                    <p className="text-4xl font-black">{gameState.score[leftPlayer]}</p>
                  </div>
                  <div className="text-center w-1/3">
                    <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-1">Score</p>
                    <p className="text-2xl font-black bg-[#22d3ee] px-4 py-1 border-[3px] border-black shadow-[4px_4px_0px_#000] inline-block">VS</p>
                  </div>
                  <div className="text-center w-1/3">
                    <p className={`text-sm font-bold uppercase ${rightColor}`}>{getPlayerLabel('p2')}</p>
                    <p className="text-4xl font-black">{gameState.score[rightPlayer]}</p>
                  </div>
                </div>

                {/* FIX: Removed the ring-4 ring-[#facc15] class that caused the yellow vibrating outline */}
                <div 
                  className={`relative w-full aspect-[10/6] bg-black border-[4px] border-black shadow-[12px_12px_0px_#000] -rotate-1 overflow-hidden touch-none select-none transition-all duration-200 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
                  onPointerDown={handlePointerDown}
                  onPointerMove={handlePointerMove}
                  onPointerUp={handlePointerUp}
                  onPointerLeave={handlePointerUp}
                  onPointerCancel={handlePointerUp}
                >
                  <canvas 
                    ref={canvasRef} 
                    width={GAME_WIDTH} 
                    height={GAME_HEIGHT} 
                    className="w-full h-full object-contain pointer-events-none"
                  />

                  {gameState.status === 'countdown' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
                      <h1 className="text-[10rem] font-black text-[#facc15] animate-bounce" style={{ WebkitTextStroke: '6px black' }}>
                        {countdown > 0 ? countdown : 'SERVE!'}
                      </h1>
                    </div>
                  )}
                </div>
                
                <div className="flex justify-center mt-8">
                  <p className={`text-center text-sm font-bold uppercase tracking-widest px-4 py-2 border-[3px] border-black shadow-[4px_4px_0px_#000] rotate-1 transition-all ${isDragging ? 'bg-[#facc15] text-black scale-105' : 'bg-[#222] text-white'}`}>
                    {isDragging ? '🏓 SWINGING!' : '👈 DRAG ANYWHERE TO MOVE RACKET'}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="w-full lg:w-80 2xl:w-96 flex flex-col shrink-0 mt-4 lg:mt-0">
          <ChatPanel messages={room.chat ?? []} onSend={handleChat} disabled={!connected} />
        </div>
      </div>
    </div>
  );
}