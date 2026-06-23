import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby';

// --- CHAT PANEL (With Scrollbar Fix & Crash Protection) ---
function ChatPanel({ messages = [], onSend }) {
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
      <div className="px-4 py-3 sm:py-4 border-b-[3px] border-black font-bold tracking-widest text-xs uppercase text-gray-200 bg-[#222] shrink-0">
        Lobby Chat
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 text-sm scrollbar-thin scrollbar-thumb-gray-600 bg-[#333]">
        {messages.length === 0 && (
          <p className="text-gray-400 text-center py-4 font-bold italic">No messages yet</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`break-words ${msg.playerId === 'SYSTEM' ? 'text-center my-3 bg-[#facc15] text-black border-[2px] border-black rounded p-2 shadow-[2px_2px_0px_#000]' : ''}`}>
            {msg.playerId !== 'SYSTEM' && <span className="font-black text-[#facc15] uppercase tracking-wider">{msg.playerName}: </span>}
            <span className={msg.playerId === 'SYSTEM' ? 'font-black text-[11px] uppercase tracking-widest' : 'text-gray-100 font-medium'}>
              {msg.message}
            </span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-2 sm:p-3 border-t-[3px] border-black flex gap-2 bg-[#2a2a2a] rounded-b-lg shrink-0">
        <input 
          type="text" 
          className="py-2 px-3 rounded text-sm flex-1 bg-black border-[2px] border-black text-white focus:outline-none focus:ring-2 focus:ring-[#facc15]" 
          placeholder="Chat..." 
          value={text} 
          onChange={(e) => setText(e.target.value)} 
        />
        <button type="submit" className="bg-[#facc15] text-black font-black uppercase border-[2px] border-black rounded px-4 py-2 shadow-[3px_3px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_#000] transition-all shrink-0">
          Send
        </button>
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
    <g transform={`translate(${start.x}, ${start.y}) rotate(${angle})`}>
      {/* Black Outlines (Drawn behind) */}
      <line x1="0" y1="-2.5" x2={length} y2="-2.5" stroke="#000" strokeWidth="2" strokeLinecap="round" />
      <line x1="0" y1="2.5" x2={length} y2="2.5" stroke="#000" strokeWidth="2" strokeLinecap="round" />
      {Array.from({length: numRungs}).map((_, i) => {
        const step = (length / numRungs) * i + (length / numRungs / 2);
        return <line key={`outline-${i}`} x1={step} y1="-2.5" x2={step} y2="2.5" stroke="#000" strokeWidth="2" />;
      })}

      {/* Flat Colored Inner Lines */}
      <line x1="0" y1="-2.5" x2={length} y2="-2.5" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" />
      <line x1="0" y1="2.5" x2={length} y2="2.5" stroke="#fbbf24" strokeWidth="1" strokeLinecap="round" />
      {Array.from({length: numRungs}).map((_, i) => {
        const step = (length / numRungs) * i + (length / numRungs / 2);
        return <line key={`fill-${i}`} x1={step} y1="-2.5" x2={step} y2="2.5" stroke="#fef3c7" strokeWidth="1" />;
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
    <g>
      {/* Thick Snake Body Outline */}
      <path d={`M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${end.x} ${end.y}`} fill="none" stroke="#000" strokeWidth="4" strokeLinecap="round" />
      {/* Snake Body Fill */}
      <path d={`M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${end.x} ${end.y}`} fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" />
      {/* Snake Belly Pattern */}
      <path d={`M ${start.x} ${start.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${end.x} ${end.y}`} fill="none" stroke="#000" strokeWidth="0.8" strokeLinecap="round" strokeDasharray="1 2" />
      
      {/* Snake Head Outline & Fill */}
      <circle cx={start.x} cy={start.y} r="2.2" fill="#000" />
      <circle cx={start.x} cy={start.y} r="1.6" fill="#22c55e" />
      
      {/* Tongue */}
      <path d={`M ${start.x} ${start.y} Q ${start.x - 2} ${start.y - 2} ${start.x - 1} ${start.y - 3}`} fill="none" stroke="#ef4444" strokeWidth="0.6" />
      
      {/* Eyes */}
      <circle cx={start.x - 0.6} cy={start.y - 0.6} r="0.5" fill="white" stroke="#000" strokeWidth="0.2" />
      <circle cx={start.x + 0.6} cy={start.y - 0.6} r="0.5" fill="white" stroke="#000" strokeWidth="0.2" />
      <circle cx={start.x - 0.6} cy={start.y - 0.6} r="0.2" fill="black" />
      <circle cx={start.x + 0.6} cy={start.y - 0.6} r="0.2" fill="black" />
    </g>
  );
};

// --- MAIN BOARD ---
export default function SnakeAndLadderBoard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [room, setRoom] = useState(location.state?.room ?? null);
  
  // Mobile chat notification states
  const [chatToast, setChatToast] = useState(null);
  const chatRef = useRef(null);

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

      // Trigger mobile toast if message isn't from me and screen is < 1024px
      if (msg.playerName !== username && window.innerWidth < 1024) {
        setChatToast(msg);
        setTimeout(() => setChatToast(null), 3500); // Hide after 3.5s
      }
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
        const intermediatePos = startPos + roll;
        
        // 1. Walk step-by-step for the dice roll amount FIRST
        if (roll > 0 && intermediatePos <= 100) {
           for (let i = 1; i <= roll; i++) {
               temp++;
               steps.push(temp);
           }
           // 2. If the intermediate spot is a snake/ladder, slide to the final target!
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
  }, [gameState]); // Triggers when server updates the game state// Triggers when server updates the game state

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

    // Visual Dice Shuffle! (Slower speed - 120ms per tick)
    let counter = 0;
    const visualRoll = setInterval(() => {
        setDiceDisplay(DICE_FACES[Math.floor(Math.random() * 6) + 1]);
        counter++;
        if (counter > 8) {
            clearInterval(visualRoll);
            
            // Animation rukne ke baad asli roll server par bhejenge
            emitWithAck('game:move', { action: 'roll' }).then(() => {
                setIsRolling(false);
            });
        }
    }, 120);
  };

  // Ensure dice always shows the actual rolled number for everyone
  useEffect(() => {
      if (gameState?.lastRoll?.roll && !isRolling) {
           setDiceDisplay(DICE_FACES[gameState.lastRoll.roll]);
      }
  }, [gameState?.lastRoll?.roll, isRolling]);

  const scrollToChat = () => {
    setChatToast(null);
    chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (!room) return (
    <div className="text-center py-24 text-black font-black uppercase tracking-widest text-xl animate-pulse">
        Connecting...
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative font-sans">
      <style>{`
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.8) translateY(30px) rotate(-5deg); } 100% { opacity: 1; transform: scale(1) translateY(0) rotate(-2deg); } }
        .animate-pop-in { animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>

      {/* Mobile Chat Notification Toast */}
      {chatToast && (
        <div 
          onClick={scrollToChat}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#3b82f6] border-[3px] border-black text-white px-4 py-3 rounded shadow-[6px_6px_0px_#000] z-50 flex items-center gap-3 cursor-pointer w-11/12 max-w-sm lg:hidden animate-[popIn_0.3s_ease-out] -rotate-1"
        >
          <span className="bg-[#facc15] border-[2px] border-black p-2 rounded-full leading-none text-black">💬</span>
          <div className="flex flex-col flex-1 truncate">
            <span className="text-xs font-black uppercase text-[#facc15]">{chatToast.playerName}</span>
            <span className="text-sm font-bold truncate">{chatToast.message}</span>
          </div>
          <span className="text-xs font-bold text-black bg-white border-[2px] border-black px-2 py-1 rounded">View</span>
        </div>
      )}

      {/* WINNER POPUP */}
      {(gameState?.status === 'won') && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white border-[4px] border-black shadow-[12px_12px_0px_#000] p-10 text-center animate-pop-in rounded-xl -rotate-2">
            <div className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-4">Game Over</div>
            <h2 className="text-5xl font-black mb-2 text-[#ef4444] tracking-tighter uppercase" style={{ WebkitTextStroke: '2px black' }}>
                {gameState.winner?.name}
            </h2>
            <h3 className="text-xl font-bold text-black mb-8 uppercase">reached 100 first! 🏆</h3>
            <div className="w-full h-[3px] bg-black mb-6" />
            <Link 
              to="/games/snake-and-ladder" 
              className="bg-[#facc15] w-full block py-4 text-sm font-black tracking-widest uppercase border-[3px] border-black shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] text-black transition-all duration-150 rounded"
            >
              Return to Hub
            </Link>
          </div>
        </div>
      )}

      {/* TOP STATUS BAR */}
      <div className="bg-white border-[3px] border-black p-4 sm:p-6 mb-6 flex flex-col md:flex-row justify-between items-center rounded-lg shadow-[8px_8px_0px_#000] gap-4 -rotate-1">
        <div className="text-center md:text-left">
          <p className="text-xs font-black tracking-widest uppercase text-gray-500 mb-1">Turn Status</p>
          <p className={`text-xl font-black uppercase ${isMyTurn ? 'text-[#3b82f6]' : 'text-black'}`}>
            {room.status === 'waiting' ? 'Waiting for host...' : isMyTurn ? "🎲 Your Turn!" : `${gameState.players[gameState.currentPlayerIndex]?.name}'s Turn`}
          </p>
        </div>
        
        {gameState?.lastRoll && (
          <div className="text-center animate-pop-in bg-gray-100 px-6 py-2 rounded border-[2px] border-black shadow-[2px_2px_0px_#000] rotate-1">
             <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-1">Last Action</p>
             <p className="text-sm font-black text-black uppercase">{gameState.lastRoll.message}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        
        {/* GAME BOARD & CONTROLS */}
        <div className="flex-1 flex flex-col gap-6">
          {room.status === 'waiting' ? (
             <WaitingLobby 
                 roomCode={room.code} 
                 isHost={isHost} 
                 playerCount={room.players.length} 
                 onStart={handleStart} 
                 gamePath="snake-and-ladder/room" 
             />
          ) : (
            <div className="relative w-full max-w-[min(95vw,580px)] mx-auto aspect-square bg-white border-[4px] border-black rounded-lg p-2 sm:p-3 shadow-[8px_8px_0px_#000] rotate-1">
              
              {/* THE 100x100 ALIGNED CANVAS */}
              <div className="relative w-full h-full border-[3px] border-black rounded overflow-hidden bg-white shadow-[inset_2px_2px_0px_rgba(0,0,0,0.1)]">
                
                {/* 1. SVG Layer for Graphic Snakes & Ladders */}
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full pointer-events-none z-10 drop-shadow-[2px_2px_0px_rgba(0,0,0,1)]">
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
                    const col = i % 10;
                    const displayNum = row % 2 === 0 ? number : 100 - (row * 10) - (9 - col);
                    // Checkerboard pattern
                    const isDark = (row + col) % 2 === 1;

                    return (
                      <div key={displayNum} className={`border-[1px] border-black/30 flex items-center justify-center relative ${isDark ? 'bg-gray-200' : 'bg-white'}`}>
                        <span className="text-[8px] md:text-[10px] font-black text-black/60 absolute top-0.5 left-1 select-none">{displayNum}</span>
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
                      className="absolute w-4 h-4 md:w-5 md:h-5 rounded-full border-[2px] border-black z-20 transition-all duration-300 ease-in-out shadow-[2px_2px_0px_#000]"
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
              <div className="bg-[#3b82f6] border-[3px] border-black p-6 rounded-lg flex flex-col items-center justify-center shadow-[6px_6px_0px_#000] -rotate-1">
                <button 
                    onClick={rollDice} 
                    disabled={!isMyTurn || isRolling} 
                    className={`text-[clamp(2rem,5vw,3.5rem)] mb-4 transition-all bg-white border-[3px] border-black rounded-xl p-4 shadow-[4px_4px_0px_#000] flex items-center justify-center ${!isMyTurn ? 'opacity-50 cursor-not-allowed translate-y-[2px] translate-x-[2px] shadow-[2px_2px_0px_#000]' : 'hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] cursor-pointer'}`}
                >
                  {diceDisplay}
                </button>
                <p className="text-xs font-black tracking-widest uppercase text-black bg-white px-3 py-1 border-[2px] border-black rounded">
                    {isMyTurn ? 'Click to Roll' : 'Wait for turn'}
                </p>
              </div>

              <div className="bg-white border-[3px] border-black p-4 rounded-lg flex flex-col gap-2 shadow-[6px_6px_0px_#000] rotate-1">
                <h3 className="text-xs font-black tracking-widest uppercase text-gray-500 mb-2 border-b-[2px] border-black pb-2">Players</h3>
                {gameState.players.map(p => (
                  <div key={p.id} className={`flex items-center gap-3 p-2 rounded border-[2px] border-black transition-colors ${p.id === gameState.players[gameState.currentPlayerIndex].id ? 'bg-[#facc15] shadow-[2px_2px_0px_#000]' : 'bg-gray-100'}`}>
                    <div className="w-4 h-4 rounded-full border-[2px] border-black shadow-[1px_1px_0px_#000]" style={{ backgroundColor: p.color }} />
                    <div className="flex-1">
                      <p className="text-sm font-black text-black uppercase">{p.name}</p>
                      <p className="text-[10px] text-gray-600 font-bold uppercase">Square: {visualPositions[p.id] ?? p.position}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* LOBBY CHAT */}
        <div ref={chatRef} className="w-full lg:w-80 shrink-0 mt-4 lg:mt-0 scroll-mt-24">
            <ChatPanel messages={room.chat ?? []} onSend={handleChat} />
        </div>
      </div>
    </div>
  );
}