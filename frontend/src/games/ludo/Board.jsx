// frontend/src/games/ludo/Board.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby';

// --- CHAT PANEL (Reused from Stone Paper Scissor & Snake Ladder) ---
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
    <div className="flex flex-col w-full h-[400px] lg:h-[550px] shrink-0 bg-[#333333] border-[3px] border-black rounded-lg shadow-[6px_6px_0px_#000] rotate-1 text-white font-sans">
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

// --- LUDO BOARD CONSTANTS & PATH MAPS ---
// 15x15 Grid. Coordinates mapped to 52 steps of outer track.
const PATH = [
  [1,6], [2,6], [3,6], [4,6], [5,6], // 0-4 (Left arm)
  [6,5], [6,4], [6,3], [6,2], [6,1], [6,0], // 5-10 (Top arm, up)
  [7,0], [8,0], // 11-12 (Top arm, cross)
  [8,1], [8,2], [8,3], [8,4], [8,5], // 13-17 (Top arm, down)
  [9,6], [10,6], [11,6], [12,6], [13,6], [14,6], // 18-23 (Right arm, right)
  [14,7], [14,8], // 24-25 (Right arm, cross)
  [13,8], [12,8], [11,8], [10,8], [9,8], // 26-30 (Right arm, left)
  [8,9], [8,10], [8,11], [8,12], [8,13], [8,14], // 31-36 (Bottom arm, down)
  [7,14], [6,14], // 37-38 (Bottom arm, cross)
  [6,13], [6,12], [6,11], [6,10], [6,9], // 39-43 (Bottom arm, up)
  [5,8], [4,8], [3,8], [2,8], [1,8], [0,8], // 44-49 (Left arm, left)
  [0,7], [0,6] // 50-51 (Left arm, cross back to start)
];

const HOME_PATHS = [
  [[1,7], [2,7], [3,7], [4,7], [5,7]], // Red (P1)
  [[7,1], [7,2], [7,3], [7,4], [7,5]], // Green (P2)
  [[13,7], [12,7], [11,7], [10,7], [9,7]], // Yellow (P3)
  [[7,13], [7,12], [7,11], [7,10], [7,9]]  // Blue (P4)
];

const BASES = [
  [[2,2], [3,2], [2,3], [3,3]], // Red Base
  [[11,2], [12,2], [11,3], [12,3]], // Green Base
  [[11,11], [12,11], [11,12], [12,12]], // Yellow Base
  [[2,11], [3,11], [2,12], [3,12]]  // Blue Base
];

const START_OFFSETS = [0, 13, 26, 39];
const SAFE_SQUARES = [0, 8, 13, 21, 26, 34, 39, 47];
const PLAYER_COLORS = ['#ef4444', '#22c55e', '#facc15', '#3b82f6']; // Red, Green, Yellow, Blue
const DICE_FACES = ['❓', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

const StarIcon = ({ cx, cy }) => (
  <polygon
    points={`${cx},${cy-3} ${cx+1},${cy-1} ${cx+3},${cy-1} ${cx+1.5},${cy+0.5} ${cx+2},${cy+3} ${cx},${cy+1.5} ${cx-2},${cy+3} ${cx-1.5},${cy+0.5} ${cx-3},${cy-1} ${cx-1},${cy-1}`}
    fill="gray" opacity="0.4"
  />
);

// --- MAIN BOARD COMPONENT ---
export default function LudoBoard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [room, setRoom] = useState(location.state?.room ?? null);
  const [chatToast, setChatToast] = useState(null);
  const chatRef = useRef(null);

  const [isRolling, setIsRolling] = useState(false);
  const [diceHighlighted, setDiceHighlighted] = useState(false);
  const [diceDisplay, setDiceDisplay] = useState('🎲');

  // Socket Connection & Event Handling
  useEffect(() => {
    const socket = connectSocket();
    const username = sessionStorage.getItem('pohahub_username');
    
    if (!username) {
      navigate(`/games/ludo?join=${roomCode}`);
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
      if (msg.playerName !== username && window.innerWidth < 1024) {
        setChatToast(msg);
        setTimeout(() => setChatToast(null), 3500);
      }
    });

    if (socket.connected) syncRoom();
    else socket.connect();

    return () => { 
      socket.off('connect'); 
      socket.off('room:update'); 
      socket.off('chat:message'); 
    };
  }, [roomCode, navigate]);

  const gameState = room?.gameState;
  const myPlayerId = room?.viewerId;
  const isHost = room?.hostId === myPlayerId;
  const isMyTurn = gameState?.players[gameState?.currentPlayerIndex]?.id === myPlayerId;

  // Dice Animation Logic
  useEffect(() => {
    if (gameState?.hasRolled && gameState.diceRoll) {
      setIsRolling(true);
      setDiceHighlighted(false);
      let counter = 0;
      const visualRoll = setInterval(() => {
          setDiceDisplay(DICE_FACES[Math.floor(Math.random() * 6) + 1]);
          counter++;
          if (counter > 5) {
              clearInterval(visualRoll);
              setDiceDisplay(DICE_FACES[gameState.diceRoll]);
              setDiceHighlighted(true);
              setTimeout(() => setIsRolling(false), 300);
          }
      }, 100);
      return () => clearInterval(visualRoll);
    } else if (gameState && !gameState.hasRolled) {
      setDiceDisplay('🎲');
      setDiceHighlighted(false);
    }
  }, [gameState?.hasRolled, gameState?.diceRoll]);

  // Actions
  const handleStart = () => emitWithAck('room:start', {});
  const handleChat = (message) => emitWithAck('chat:message', { message });
  
  const rollDice = () => {
    if (!isMyTurn || gameState.hasRolled || isRolling) return;
    setIsRolling(true);
    emitWithAck('game:move', { action: 'roll' });
  };

  const handleMoveToken = (tokenId) => {
    if (!isMyTurn || !gameState.hasRolled || isRolling) return;
    emitWithAck('game:move', { action: 'move', tokenId });
  };

  const scrollToChat = () => {
    setChatToast(null);
    chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  if (!room) return (
    <div className="text-center py-24 text-black font-black uppercase tracking-widest text-xl animate-pulse">
        Connecting...
    </div>
  );

  // Group tokens for rendering
  const tokenPositions = {};
  if (gameState?.players) {
    gameState.players.forEach((p, pIdx) => {
      p.tokens.forEach((token, tIdx) => {
        let x, y;
        if (token.position === -1) {
          [x, y] = BASES[pIdx][tIdx];
        } else if (token.position >= 0 && token.position <= 51) {
          [x, y] = PATH[(token.position + START_OFFSETS[pIdx]) % 52];
        } else if (token.position >= 52 && token.position <= 56) {
          [x, y] = HOME_PATHS[pIdx][token.position - 52];
        } else if (token.position === 57) {
          x = 7; y = 7; // Center
        }

        if (x !== undefined && y !== undefined) {
          const key = `${x},${y}`;
          if (!tokenPositions[key]) tokenPositions[key] = [];
          tokenPositions[key].push({
            pIdx,
            tokenId: token.id,
            color: p.color || PLAYER_COLORS[pIdx],
            isMine: p.id === myPlayerId,
            position: token.position
          });
        }
      });
    });
  }

  const isButtonDisabled = !isMyTurn || gameState?.hasRolled || isRolling;
  let btnClass = "text-[clamp(2.5rem,5vw,4rem)] mb-4 transition-all duration-300 bg-white border-[3px] rounded-xl p-4 flex items-center justify-center relative ";
  if (diceHighlighted) {
      btnClass += " border-[#facc15] shadow-[0px_0px_25px_#facc15] text-[#ef4444] scale-110 z-10 ";
  } else if (isButtonDisabled) {
      btnClass += " border-black text-gray-400 bg-gray-100 shadow-[2px_2px_0px_#000] translate-y-[2px] translate-x-[2px] cursor-not-allowed ";
  } else {
      btnClass += " border-black text-black shadow-[4px_4px_0px_#000] hover:-translate-y-1 hover:shadow-[6px_6px_0px_#000] cursor-pointer ";
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 relative font-sans">
      <style>{`
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.8) translateY(30px) rotate(-5deg); } 100% { opacity: 1; transform: scale(1) translateY(0) rotate(-2deg); } }
        .animate-pop-in { animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>

      {/* Mobile Chat Toast */}
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

      {/* Winner Modal */}
      {(gameState?.status === 'won') && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white border-[4px] border-black shadow-[12px_12px_0px_#000] p-10 text-center animate-pop-in rounded-xl -rotate-2">
            <div className="text-xs font-bold tracking-[0.3em] uppercase text-gray-500 mb-4">Game Over</div>
            <h2 className="text-5xl font-black mb-2 text-[#ef4444] tracking-tighter uppercase" style={{ WebkitTextStroke: '2px black' }}>
                {gameState.winner?.name}
            </h2>
            <h3 className="text-xl font-bold text-black mb-8 uppercase">Wins the game! 🏆</h3>
            <div className="w-full h-[3px] bg-black mb-6" />
            <Link 
              to="/games/ludo" 
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
        
        {gameState?.message && (
          <div className="text-center animate-pop-in bg-gray-100 px-6 py-2 rounded border-[2px] border-black shadow-[2px_2px_0px_#000] rotate-1">
             <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-1">Game Message</p>
             <p className="text-sm font-black text-black uppercase">{gameState.message}</p>
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
        
        {/* MAIN GAME AREA */}
        <div className="flex-1 flex flex-col gap-6">
          {room.status === 'waiting' ? (
             <WaitingLobby 
                 roomCode={room.code} 
                 isHost={isHost} 
                 playerCount={room.players.length} 
                 onStart={handleStart} 
                 gamePath="ludo/room" 
             />
          ) : (
            <div className="relative w-full max-w-[min(95vw,600px)] mx-auto aspect-square bg-white border-[4px] border-black rounded-lg p-2 sm:p-3 shadow-[8px_8px_0px_#000] rotate-1">
              
              <div className="relative w-full h-full border-[3px] border-black rounded bg-white shadow-[inset_2px_2px_0px_rgba(0,0,0,0.1)] overflow-hidden">
                
                <svg viewBox="0 0 150 150" className="w-full h-full">
                  {/* Grid Background Lines (Optional clean look) */}
                  <rect width="150" height="150" fill="#fafafa" />

                  {/* BASES */}
                  {/* Red Base (Top Left) */}
                  <g>
                    <rect x="0" y="0" width="60" height="60" fill={PLAYER_COLORS[0]} stroke="black" strokeWidth="0.5" />
                    <rect x="12" y="12" width="36" height="36" fill="white" stroke="black" strokeWidth="0.5" rx="3" />
                  </g>
                  {/* Green Base (Top Right) */}
                  <g>
                    <rect x="90" y="0" width="60" height="60" fill={PLAYER_COLORS[1]} stroke="black" strokeWidth="0.5" />
                    <rect x="102" y="12" width="36" height="36" fill="white" stroke="black" strokeWidth="0.5" rx="3" />
                  </g>
                  {/* Yellow Base (Bottom Right) */}
                  <g>
                    <rect x="90" y="90" width="60" height="60" fill={PLAYER_COLORS[2]} stroke="black" strokeWidth="0.5" />
                    <rect x="102" y="102" width="36" height="36" fill="white" stroke="black" strokeWidth="0.5" rx="3" />
                  </g>
                  {/* Blue Base (Bottom Left) */}
                  <g>
                    <rect x="0" y="90" width="60" height="60" fill={PLAYER_COLORS[3]} stroke="black" strokeWidth="0.5" />
                    <rect x="12" y="102" width="36" height="36" fill="white" stroke="black" strokeWidth="0.5" rx="3" />
                  </g>

                  {/* BASE CIRCLE SPOTS */}
                  {BASES.map((playerBases, pIdx) =>
                    playerBases.map((base, bIdx) => (
                      <circle key={`basespot-${pIdx}-${bIdx}`} cx={base[0]*10+5} cy={base[1]*10+5} r="3" fill="transparent" stroke="gray" strokeWidth="0.5" />
                    ))
                  )}

                  {/* PATHS (Outer Track) */}
                  {PATH.map((coord, idx) => {
                    const isSafe = SAFE_SQUARES.includes(idx);
                    let fill = 'white';
                    if (idx === 0) fill = '#fca5a5';
                    else if (idx === 13) fill = '#bbf7d0';
                    else if (idx === 26) fill = '#fef08a';
                    else if (idx === 39) fill = '#bfdbfe';
                    else if (isSafe) fill = '#e5e7eb';

                    return (
                      <g key={`path-${idx}`}>
                        <rect x={coord[0]*10} y={coord[1]*10} width="10" height="10" fill={fill} stroke="black" strokeWidth="0.5" />
                        {isSafe && <StarIcon cx={coord[0]*10+5} cy={coord[1]*10+5} />}
                        {/* Start Arrows */}
                        {idx === 0 && <polygon points={`${coord[0]*10+2},${coord[1]*10+2} ${coord[0]*10+8},${coord[1]*10+5} ${coord[0]*10+2},${coord[1]*10+8}`} fill="black" opacity="0.2"/>}
                        {idx === 13 && <polygon points={`${coord[0]*10+2},${coord[1]*10+2} ${coord[0]*10+8},${coord[1]*10+2} ${coord[0]*10+5},${coord[1]*10+8}`} fill="black" opacity="0.2"/>}
                        {idx === 26 && <polygon points={`${coord[0]*10+8},${coord[1]*10+2} ${coord[0]*10+2},${coord[1]*10+5} ${coord[0]*10+8},${coord[1]*10+8}`} fill="black" opacity="0.2"/>}
                        {idx === 39 && <polygon points={`${coord[0]*10+2},${coord[1]*10+8} ${coord[0]*10+8},${coord[1]*10+8} ${coord[0]*10+5},${coord[1]*10+2}`} fill="black" opacity="0.2"/>}
                      </g>
                    );
                  })}

                  {/* HOME PATHS */}
                  {HOME_PATHS.map((path, pIdx) =>
                    path.map((coord, hIdx) => (
                      <rect key={`home-${pIdx}-${hIdx}`} x={coord[0]*10} y={coord[1]*10} width="10" height="10" fill={PLAYER_COLORS[pIdx]} stroke="black" strokeWidth="0.5" opacity="0.7" />
                    ))
                  )}

                  {/* CENTER FINISH */}
                  <g>
                    {/* Top Triangle (Green) */}
                    <polygon points="60,60 90,60 75,75" fill={PLAYER_COLORS[1]} stroke="black" strokeWidth="0.5" />
                    {/* Right Triangle (Yellow) */}
                    <polygon points="90,60 90,90 75,75" fill={PLAYER_COLORS[2]} stroke="black" strokeWidth="0.5" />
                    {/* Bottom Triangle (Blue) */}
                    <polygon points="60,90 90,90 75,75" fill={PLAYER_COLORS[3]} stroke="black" strokeWidth="0.5" />
                    {/* Left Triangle (Red) */}
                    <polygon points="60,60 60,90 75,75" fill={PLAYER_COLORS[0]} stroke="black" strokeWidth="0.5" />
                  </g>

                  {/* TOKENS */}
                  {Object.entries(tokenPositions).map(([coordStr, tokens]) => {
                    const [x, y] = coordStr.split(',').map(Number);
                    const count = tokens.length;
                    
                    return tokens.map((t, i) => {
                      let dx = 0, dy = 0;
                      let scale = 1;

                      // Clustering for overlaps
                      if (count > 1) {
                        const angle = (2 * Math.PI * i) / count;
                        const radius = count > 2 ? 2.5 : 1.5;
                        dx = Math.cos(angle) * radius;
                        dy = Math.sin(angle) * radius;
                        scale = 0.8;
                      }

                      // Adjust finish overlap
                      if (t.position === 57) {
                        const finishOffsets = [[-3,0], [0,-3], [3,0], [0,3]]; // R, G, Y, B offsets inside center
                        dx += finishOffsets[t.pIdx]?.[0] || 0;
                        dy += finishOffsets[t.pIdx]?.[1] || 0;
                        scale = 0.7;
                      }

                      const cx = x * 10 + 5 + dx;
                      const cy = y * 10 + 5 + dy;
                      const isClickable = t.isMine && isMyTurn && gameState?.hasRolled && !isRolling;

                      return (
                        <circle
                          key={`${t.pIdx}-${t.tokenId}`}
                          cx={cx} cy={cy} r={4 * scale}
                          fill={t.color}
                          stroke="black" 
                          strokeWidth={isClickable ? "1" : "0.6"}
                          style={{
                            cursor: isClickable ? 'pointer' : 'default',
                            transition: 'all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)'
                          }}
                          onClick={() => {
                            if (isClickable) handleMoveToken(t.tokenId);
                          }}
                        >
                          {isClickable && <animate attributeName="r" values={`${4*scale};${5*scale};${4*scale}`} dur="1s" repeatCount="indefinite" />}
                        </circle>
                      );
                    });
                  })}
                </svg>
              </div>
            </div>
          )}

          {/* DICE & PLAYER LIST */}
          {room.status === 'playing' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-[#3b82f6] border-[3px] border-black p-6 rounded-lg flex flex-col items-center justify-center shadow-[6px_6px_0px_#000] -rotate-1">
                <button 
                    onClick={rollDice} 
                    disabled={isButtonDisabled} 
                    className={btnClass}
                >
                  {diceDisplay}
                </button>
                
                <p className="text-xs font-black tracking-widest uppercase text-black bg-white px-3 py-1 border-[2px] border-black rounded transition-all">
                    {isRolling ? 'Rolling...' : isMyTurn && !gameState.hasRolled ? 'Click to Roll' : isMyTurn && gameState.hasRolled ? 'Move a Token' : 'Wait for turn'}
                </p>
              </div>

              <div className="bg-white border-[3px] border-black p-4 rounded-lg flex flex-col gap-2 shadow-[6px_6px_0px_#000] rotate-1">
                <h3 className="text-xs font-black tracking-widest uppercase text-gray-500 mb-2 border-b-[2px] border-black pb-2">Players</h3>
                {gameState.players.map((p, i) => (
                  <div key={p.id} className={`flex items-center gap-3 p-2 rounded border-[2px] border-black transition-colors ${p.id === gameState.players[gameState.currentPlayerIndex].id ? 'bg-[#facc15] shadow-[2px_2px_0px_#000]' : 'bg-gray-100'}`}>
                    <div className="w-4 h-4 rounded-full border-[2px] border-black shadow-[1px_1px_0px_#000]" style={{ backgroundColor: p.color || PLAYER_COLORS[i] }} />
                    <div className="flex-1">
                      <p className="text-sm font-black text-black uppercase">{p.name} {p.id === myPlayerId ? '(You)' : ''}</p>
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