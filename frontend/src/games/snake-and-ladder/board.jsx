import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';

// Reusable Chat Panel from Scribble
function ChatPanel({ messages, onSend }) {
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
    <div className="glass-card flex flex-col h-full bg-[#0a0a0c]/80 border-white/[0.05] rounded-2xl overflow-hidden min-h-[300px]">
      <div className="px-4 py-3 border-b border-white/[0.05] font-bold tracking-widest text-xs uppercase text-gray-400">
        Lobby Chat
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-sm scrollbar-thin scrollbar-thumb-gray-800">
        {messages.map((msg) => (
          <div key={msg.id} className={`break-words ${msg.playerId === 'SYSTEM' ? 'text-center my-2' : ''}`}>
            {msg.playerId !== 'SYSTEM' && <span className="font-semibold text-gray-300">{msg.playerName}: </span>}
            <span className={msg.playerId === 'SYSTEM' ? 'text-gray-500 italic text-[11px] uppercase tracking-wider' : 'text-gray-400 font-light'}>
              {msg.message}
            </span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/[0.05] flex gap-2">
        <input type="text" className="input-field py-2 text-sm flex-1 bg-black/50" placeholder="Chat..." value={text} onChange={(e) => setText(e.target.value)} />
        <button type="submit" className="btn-primary py-2 px-4 text-sm">Send</button>
      </form>
    </div>
  );
}

export default function SnakeAndLadderBoard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [room, setRoom] = useState(location.state?.room ?? null);
  const [isRolling, setIsRolling] = useState(false);

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

    if (socket.connected) syncRoom();
    else socket.connect();

    return () => { socket.off('connect'); socket.off('room:update'); };
  }, [roomCode, navigate]);

  const gameState = room?.gameState;
  const myPlayerId = room?.viewerId;
  const isHost = room?.hostId === myPlayerId;
  const isMyTurn = gameState?.players[gameState?.currentPlayerIndex]?.id === myPlayerId;

  const handleStart = () => emitWithAck('room:start', {});
  const handleChat = (message) => emitWithAck('chat:message', { message });
  
  const rollDice = async () => {
    if (!isMyTurn || isRolling) return;
    setIsRolling(true);
    // Add a tiny fake delay so the button feels satisfying
    setTimeout(async () => {
      await emitWithAck('game:move', { action: 'roll' });
      setIsRolling(false);
    }, 500);
  };

  // --- GRID MATH LOGIC ---
  // Calculates X,Y percentages for drawing SVG lines and placing players
  const getCoordinates = (position) => {
    if (position === 0) return { x: 5, y: 105 }; // Off board at bottom left
    const row = Math.floor((position - 1) / 10);
    const isLtoR = row % 2 === 0;
    const col = isLtoR ? (position - 1) % 10 : 9 - ((position - 1) % 10);
    return {
      x: (col * 10) + 5,      // Center of cell X
      y: ((9 - row) * 10) + 5 // Center of cell Y
    };
  };

  if (!room) return <div className="text-center py-24 text-gray-500 uppercase tracking-widest animate-pulse">Connecting...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative">
      <style>{`
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.95) translateY(20px); filter: blur(10px); } 100% { opacity: 1; transform: scale(1) translateY(0); filter: blur(0px); } }
        .animate-pop-in { animation: popIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        .dice-shake { animation: shake 0.5s cubic-bezier(.36,.07,.19,.97) both; }
        @keyframes shake { 10%, 90% { transform: translate3d(-1px, 0, 0); } 20%, 80% { transform: translate3d(2px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-4px, 0, 0); } 40%, 60% { transform: translate3d(4px, 0, 0); } }
      `}</style>

      {/* WINNER POPUP */}
      {(gameState?.status === 'won') && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div className="relative w-full max-w-md glass-card bg-[#0a0a0c] border border-white/[0.1] shadow-[0_0_50px_rgba(255,255,255,0.05)] p-10 text-center animate-pop-in rounded-3xl">
            <div className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-4">Game Over</div>
            <h2 className="text-5xl font-extrabold mb-2 text-white tracking-tighter drop-shadow-2xl">{gameState.winner?.name}</h2>
            <h3 className="text-xl font-light text-gray-300 mb-8 tracking-wide">reached 100 first! 🏆</h3>
            <Link to="/games/snake-and-ladder" className="btn-primary w-full block py-4 text-sm font-bold uppercase rounded-xl">Return to Hub</Link>
          </div>
        </div>
      )}

      {/* TOP STATUS BAR */}
      <div className="glass-card bg-[#0a0a0c]/80 border-white/[0.05] p-6 mb-6 flex flex-col md:flex-row justify-between items-center rounded-2xl gap-4">
        <div>
          <p className="text-xs font-bold tracking-[0.2em] uppercase text-gray-600">Turn Status</p>
          <p className={`text-xl font-mono font-bold ${isMyTurn ? 'text-emerald-400' : 'text-gray-200'}`}>
            {room.status === 'waiting' ? 'Waiting for host...' : isMyTurn ? "🎲 Your Turn!" : `${gameState.players[gameState.currentPlayerIndex]?.name}'s Turn`}
          </p>
        </div>
        
        {/* Recent Roll Display */}
        {gameState?.lastRoll && (
          <div className="text-center animate-pop-in bg-white/5 px-6 py-2 rounded-xl border border-white/10">
             <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-1">Last Action</p>
             <p className="text-sm font-medium text-white">{gameState.lastRoll.message}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* GAME BOARD AREA */}
        <div className="flex-1 flex flex-col gap-4">
          {room.status === 'waiting' ? (
             <div className="text-center py-20 border border-dashed border-white/[0.1] rounded-3xl bg-[#0a0a0c]/50 flex flex-col items-center justify-center">
               <p className="text-base text-gray-400 mb-6 font-light max-w-sm">Share code: <strong className="text-white font-mono">{room.code}</strong><br/>Need at least 2 players.</p>
               {isHost ? <button className="btn-primary" onClick={handleStart} disabled={room.players.length < 2}>Start Game</button> : <p className="text-gray-500 animate-pulse">Waiting for host...</p>}
             </div>
          ) : (
            <div className="relative w-full max-w-[600px] mx-auto aspect-square glass-card bg-[#111] border-white/10 rounded-2xl overflow-hidden p-2">
              
              {/* SVG OVERLAY FOR SNAKES & LADDERS */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none z-10 opacity-70">
                {Object.entries(gameState.snakes).map(([head, tail]) => {
                  const h = getCoordinates(parseInt(head));
                  const t = getCoordinates(tail);
                  return <line key={`snake-${head}`} x1={`${h.x}%`} y1={`${h.y}%`} x2={`${t.x}%`} y2={`${t.y}%`} stroke="#ef4444" strokeWidth="4" strokeDasharray="6,6" strokeLinecap="round" />
                })}
                {Object.entries(gameState.ladders).map(([bottom, top]) => {
                  const b = getCoordinates(parseInt(bottom));
                  const t = getCoordinates(top);
                  return <line key={`ladder-${bottom}`} x1={`${b.x}%`} y1={`${b.y}%`} x2={`${t.x}%`} y2={`${t.y}%`} stroke="#22c55e" strokeWidth="4" strokeLinecap="round" />
                })}
              </svg>

              {/* GRID */}
              <div className="grid grid-cols-10 grid-rows-10 w-full h-full border border-white/5 relative z-0">
                {Array.from({ length: 100 }, (_, i) => {
                  const number = 100 - i;
                  const row = Math.floor(i / 10);
                  const displayNum = row % 2 === 0 ? number : 100 - (row * 10) - (9 - (i % 10));
                  
                  return (
                    <div key={displayNum} className="border border-white/5 flex items-center justify-center relative">
                      <span className="text-[10px] md:text-xs font-bold text-gray-700/50 absolute top-1 left-1">{displayNum}</span>
                    </div>
                  );
                })}
              </div>

              {/* PLAYER TOKENS */}
              {gameState.players.map(p => {
                if (p.position === 0) return null; // Don't show if they haven't started
                const coords = getCoordinates(p.position);
                return (
                  <div 
                    key={p.id} 
                    className="absolute w-4 h-4 md:w-5 md:h-5 rounded-full shadow-[0_0_10px_rgba(0,0,0,0.8)] border-2 border-white/80 z-20 transition-all duration-700 ease-in-out"
                    style={{ 
                      backgroundColor: p.color, 
                      left: `calc(${coords.x}% - 10px)`, 
                      top: `calc(${coords.y}% - 10px)` 
                    }}
                  />
                );
              })}
            </div>
          )}

          {/* PLAYER CONTROLS & LEADERBOARD */}
          {room.status === 'playing' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Dice Roller */}
              <div className="glass-card bg-[#111] p-6 rounded-xl flex flex-col items-center justify-center border-white/5">
                <button 
                  onClick={rollDice} 
                  disabled={!isMyTurn || isRolling}
                  className={`text-6xl mb-4 transition-all ${!isMyTurn ? 'opacity-20 cursor-not-allowed' : 'hover:scale-110 cursor-pointer drop-shadow-[0_0_15px_rgba(255,255,255,0.2)]'} ${isRolling ? 'dice-shake' : ''}`}
                >
                  🎲
                </button>
                <p className="text-xs font-bold tracking-widest uppercase text-gray-500">
                  {isMyTurn ? 'Click to Roll' : 'Wait for your turn'}
                </p>
              </div>

              {/* Player List */}
              <div className="glass-card bg-[#111] p-4 rounded-xl border-white/5 flex flex-col gap-2">
                {gameState.players.map(p => (
                  <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border ${p.id === gameState.players[gameState.currentPlayerIndex].id ? 'border-white/20 bg-white/5' : 'border-transparent'}`}>
                    <div className="w-4 h-4 rounded-full border border-white/50" style={{ backgroundColor: p.color }} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{p.name}</p>
                      <p className="text-[10px] text-gray-500 font-mono">Square: {p.position}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CHAT PANEL */}
        <div className="lg:w-80 h-[400px] lg:h-auto">
          <ChatPanel messages={room.chat ?? []} onSend={handleChat} />
        </div>
      </div>
    </div>
  );
}