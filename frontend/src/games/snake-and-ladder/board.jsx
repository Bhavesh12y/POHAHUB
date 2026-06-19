import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby';

// --- CHAT PANEL ---
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
      <div className="px-4 py-3 border-b border-white/[0.05] font-bold tracking-widest text-xs uppercase text-gray-400">Lobby Chat</div>
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

// --- SVG GRAPHICS HELPERS ---
const getCoordinates = (position) => {
  if (position === 0) return { x: 5, y: 105 }; 
  const row = Math.floor((position - 1) / 10);
  const isLtoR = row % 2 === 0;
  const col = isLtoR ? (position - 1) % 10 : 9 - ((position - 1) % 10);
  return { x: (col * 10) + 5, y: ((9 - row) * 10) + 5 }; // Returns 0-100 coordinates
};

const LadderGraphic = ({ start, end }) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.sqrt(dx*dx + dy*dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);
  const numRungs = Math.floor(length / 4); // Spacing between rungs
  
  return (
    <g transform={`translate(${start.x}, ${start.y}) rotate(${angle})`} className="drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
      {/* Wood Rails */}
      <line x1="0" y1="-2" x2={length} y2="-2" stroke="#78350f" strokeWidth="1" strokeLinecap="round" />
      <line x1="0" y1="2" x2={length} y2="2" stroke="#78350f" strokeWidth="1" strokeLinecap="round" />
      {/* Rungs */}
      {Array.from({length: numRungs}).map((_, i) => {
        const step = (length / numRungs) * i + (length / numRungs / 2);
        return <line key={i} x1={step} y1="-2.5" x2={step} y2="2.5" stroke="#92400e" strokeWidth="0.8" />;
      })}
    </g>
  );
};

const SnakeGraphic = ({ start, end }) => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  // Create a curvy, winding path using bezier control points
  const cx1 = start.x + dx * 0.8 + dy * 0.3;
  const cy1 = start.y + dy * 0.2 - dx * 0.3;
  const cx2 = start.x + dx * 0.2 - dy * 0.3;
  const cy2 = start.y + dy * 0.8 + dx * 0.3;

  return (
    <g className="drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]">
      {/* Thick Snake Body */}
      <path d={`M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${end.x} ${end.y}`} fill="none" stroke="#047857" strokeWidth="2.5" strokeLinecap="round" />
      {/* Snake Belly Pattern */}
      <path d={`M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${end.x} ${end.y}`} fill="none" stroke="#34d399" strokeWidth="1" strokeLinecap="round" strokeDasharray="1 1.5" />
      {/* Snake Head */}
      <circle cx={start.x} cy={start.y} r="1.8" fill="#047857" />
      <circle cx={start.x} cy={start.y} r="1.2" fill="#ef4444" />
      {/* Eyes */}
      <circle cx={start.x - 0.5} cy={start.y - 0.5} r="0.4" fill="white" />
      <circle cx={start.x + 0.5} cy={start.y - 0.5} r="0.4" fill="white" />
      <circle cx={start.x - 0.5} cy={start.y - 0.5} r="0.1" fill="black" />
      <circle cx={start.x + 0.5} cy={start.y - 0.5} r="0.1" fill="black" />
    </g>
  );
};

// --- MAIN BOARD ---
export default function SnakeAndLadderBoard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [room, setRoom] = useState(location.state?.room ?? null);
  
  // Animation & Dice States
  const [isRolling, setIsRolling] = useState(false);
  const [diceDisplay, setDiceDisplay] = useState('🎲');
  const DICE_FACES = ['❓', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  
  // Step-by-Step Position States
  const [visualPositions, setVisualPositions] = useState({});
  const animationQueue = useRef({});

  // Socket Connection
  useEffect(() => {
    const socket = connectSocket();
    const username = sessionStorage.getItem('pohahub_username');
    if (!username) {
      navigate(`/games/snake-and-ladder?join=${roomCode}`);
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

    if (socket.connected) syncRoom();
    else socket.connect();

    return () => { socket.off('connect'); socket.off('room:update'); socket.off('chat:message'); };
  }, [roomCode, navigate]);

  const gameState = room?.gameState;
  const myPlayerId = room?.viewerId;
  const isHost = room?.hostId === myPlayerId;
  const isMyTurn = gameState?.players[gameState?.currentPlayerIndex]?.id === myPlayerId;

  // --- LOGIC: QUEUE ANIMATION STEPS ---
  useEffect(() => {
    if (!gameState?.players) return;

    let needsInit = false;
    const initialPositions = { ...visualPositions };

    gameState.players.forEach(p => {
      const currentVisual = visualPositions[p.id];
      
      // On first load, immediately set positions to the grid
      if (currentVisual === undefined) {
        initialPositions[p.id] = p.position;
        needsInit = true;
      } 
      // If server position moved, queue the steps
      else if (currentVisual !== p.position) {
        const startPos = currentVisual;
        const targetPos = p.position;
        const roll = gameState.lastRoll?.playerId === p.id ? gameState.lastRoll.roll : 0;
        
        const steps = [];
        let temp = startPos;
        
        // 1. Walk step-by-step for the dice roll amount
        if (roll > 0 && startPos + roll <= 100 && startPos < targetPos) {
           for (let i = 1; i <= roll; i++) {
               temp++;
               steps.push(temp);
           }
           // 2. If the final spot is a snake/ladder, slide to target!
           if (temp !== targetPos) steps.push(targetPos);
        } else {
           // Fallback jump if rules bounce back
           steps.push(targetPos);
        }

        animationQueue.current[p.id] = (animationQueue.current[p.id] || []).concat(steps);
        needsInit = true; // Trigger the interval to start pulling from queue
      }
    });

    if (needsInit && Object.keys(visualPositions).length === 0) setVisualPositions(initialPositions);
  }, [gameState]); // Triggers when server updates the game state

  // --- LOGIC: EXECUTE ANIMATION QUEUE ---
  useEffect(() => {
    const interval = setInterval(() => {
        let moved = false;
        const newVis = { ...visualPositions };
        
        Object.keys(animationQueue.current).forEach(id => {
            if (animationQueue.current[id] && animationQueue.current[id].length > 0) {
                newVis[id] = animationQueue.current[id].shift(); // Pop the next step
                moved = true;
            }
        });

        if (moved) setVisualPositions(newVis);
    }, 400); // 400ms pause on each square

    return () => clearInterval(interval);
  }, [visualPositions]);

  // --- LOGIC: ROLL DICE ---
  const handleStart = () => emitWithAck('room:start', {});
  const handleChat = (message) => emitWithAck('chat:message', { message });
  
  const rollDice = async () => {
    if (!isMyTurn || isRolling) return;
    setIsRolling(true);

    // Visual Dice Shuffle!
    let counter = 0;
    const visualRoll = setInterval(() => {
        setDiceDisplay(DICE_FACES[Math.floor(Math.random() * 6) + 1]);
        counter++;
        if (counter > 10) clearInterval(visualRoll);
    }, 50);

    // After 600ms of visual shuffling, execute real move
    setTimeout(async () => {
      await emitWithAck('game:move', { action: 'roll' });
      setIsRolling(false);
    }, 600);
  };

  // Ensure dice always shows the actual rolled number for everyone
  useEffect(() => {
      if (gameState?.lastRoll?.roll && !isRolling) {
           setDiceDisplay(DICE_FACES[gameState.lastRoll.roll]);
      }
  }, [gameState?.lastRoll?.roll, isRolling]);

  if (!room) return <div className="text-center py-24 text-gray-500 uppercase tracking-widest animate-pulse">Connecting...</div>;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative">
      <style>{`
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.95) translateY(20px); } 100% { opacity: 1; transform: scale(1) translateY(0); } }
        .animate-pop-in { animation: popIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
      `}</style>

      {/* WINNER POPUP */}
      {(gameState?.status === 'won') && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-md" />
          <div className="relative w-full max-w-md glass-card bg-[#0a0a0c] border border-white/[0.1] shadow-[0_0_50px_rgba(255,255,255,0.05)] p-10 text-center animate-pop-in rounded-3xl">
            <div className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-4">Game Over</div>
            <h2 className="text-5xl font-extrabold mb-2 text-white tracking-tighter">{gameState.winner?.name}</h2>
            <h3 className="text-xl font-light text-gray-300 mb-8">reached 100 first! 🏆</h3>
            <Link to="/" className="btn-primary w-full block py-4 text-sm font-bold uppercase rounded-xl">Return to Hub</Link>
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
        
        {gameState?.lastRoll && (
          <div className="text-center animate-pop-in bg-white/5 px-6 py-2 rounded-xl border border-white/10">
             <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-1">Last Action</p>
             <p className="text-sm font-medium text-white">{gameState.lastRoll.message}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        
        {/* GAME BOARD & CONTROLS */}
        <div className="flex-1 flex flex-col gap-4">
          {room.status === 'waiting' ? (
             <WaitingLobby 
                 roomCode={room.code} 
                 isHost={isHost} 
                 playerCount={room.players.length} 
                 onStart={handleStart} 
                 gamePath="snake-and-ladder/room" 
             />
          ) : (
            <div className="relative w-full max-w-[600px] mx-auto aspect-square glass-card bg-[#111] border-white/10 rounded-2xl p-3">
              
              {/* THE 100x100 ALIGNED CANVAS */}
              <div className="relative w-full h-full border border-white/5 rounded-lg overflow-hidden bg-[#0a0a0c]">
                
                {/* 1. SVG Layer for Graphic Snakes & Ladders */}
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-10">
                  {Object.entries(gameState.ladders).map(([bottom, top]) => (
                    <LadderGraphic key={`ladder-${bottom}`} start={getCoordinates(parseInt(bottom))} end={getCoordinates(top)} />
                  ))}
                  {Object.entries(gameState.snakes).map(([head, tail]) => (
                    <SnakeGraphic key={`snake-${head}`} start={getCoordinates(parseInt(head))} end={getCoordinates(tail)} />
                  ))}
                </svg>

                {/* 2. CSS Grid Layer for Numbers */}
                <div className="grid grid-cols-10 grid-rows-10 w-full h-full relative z-0">
                  {Array.from({ length: 100 }, (_, i) => {
                    const number = 100 - i;
                    const row = Math.floor(i / 10);
                    const displayNum = row % 2 === 0 ? number : 100 - (row * 10) - (9 - (i % 10));
                    return (
                      <div key={displayNum} className="border border-white/10 flex items-center justify-center relative bg-slate-900/80 shadow-inner">
                        <span className="text-[9px] md:text-xs font-bold text-white/70 absolute top-1 left-1">{displayNum}</span>
                      </div>
                    );
                  })}
                </div>

                {/* 3. Player Tokens Layer (Animated!) */}
                {gameState.players.map(p => {
                  const displayPos = visualPositions[p.id] ?? p.position;
                  if (displayPos === 0) return null;
                  const coords = getCoordinates(displayPos);
                  
                  return (
                    <div 
                      key={p.id} 
                      className="absolute w-4 h-4 md:w-5 md:h-5 rounded-full shadow-[0_0_15px_rgba(0,0,0,1)] border-[1.5px] border-white/80 z-20 transition-all duration-300 ease-in-out"
                      style={{ 
                        backgroundColor: p.color, 
                        left: `calc(${coords.x}% - 8px)`, 
                        top: `calc(${coords.y}% - 8px)` 
                      }}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* DICE & PLAYER LIST */}
          {room.status === 'playing' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-card bg-[#111] p-6 rounded-xl flex flex-col items-center justify-center border-white/5">
                <button onClick={rollDice} disabled={!isMyTurn || isRolling} className={`text-6xl mb-4 transition-transform ${!isMyTurn ? 'opacity-20 cursor-not-allowed' : 'hover:scale-110 cursor-pointer drop-shadow-[0_0_20px_rgba(255,255,255,0.2)]'}`}>
                  {diceDisplay}
                </button>
                <p className="text-xs font-bold tracking-widest uppercase text-gray-500">{isMyTurn ? 'Click to Roll' : 'Wait for your turn'}</p>
              </div>

              <div className="glass-card bg-[#111] p-4 rounded-xl border-white/5 flex flex-col gap-2">
                {gameState.players.map(p => (
                  <div key={p.id} className={`flex items-center gap-3 p-3 rounded-lg border ${p.id === gameState.players[gameState.currentPlayerIndex].id ? 'border-white/20 bg-white/5' : 'border-transparent'}`}>
                    <div className="w-4 h-4 rounded-full border border-white/50 shadow-md" style={{ backgroundColor: p.color }} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-white">{p.name}</p>
                      <p className="text-[10px] text-gray-500 font-mono">Square: {visualPositions[p.id] ?? p.position}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* LOBBY CHAT */}
        <div className="lg:w-80 h-[400px] lg:h-auto"><ChatPanel messages={room.chat ?? []} onSend={handleChat} /></div>
      </div>
    </div>
  );
}