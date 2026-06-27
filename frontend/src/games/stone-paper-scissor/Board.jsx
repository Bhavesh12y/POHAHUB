import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import rockImg from '../../images/rock.png';
import paperImg from '../../images/paper1.png';
import scissorImg from '../../images/scissor.png';
import VoiceChat from '../../components/VoiceChat';

const ICONS = {
  stone: (
      <img 
    src={rockImg} 
    alt="Rock" 
    className="w-full h-full object-contain" 
  />
  ),
  paper: (
    <img 
  src={paperImg} 
  alt="Paper" 
  className="w-full h-full object-contain" 
/>
  ),
  scissor: (
      <img 
    src={scissorImg} 
    alt="Scissor" 
    className="w-full h-full object-contain" 
  />
  ),
  hidden: (
    <svg viewBox="0 0 64 64" className="w-full h-full">
      <circle cx="32" cy="32" r="28" fill="#111827" />
      <text x="32" y="38" textAnchor="middle" fontSize="20" fill="#f9fafb" fontWeight="700">?</text>
    </svg>
  )
};

const CHOICE_COLORS = { stone: '#6366f1', paper: '#f97316', scissor: '#10b981' };
const AVATAR_PALETTE = ['#ef4444', '#6366f1', '#10b981', '#f97316', '#eab308', '#06b6d4', '#ec4899'];

function avatarColor(name = '') {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_PALETTE[Math.abs(hash) % AVATAR_PALETTE.length];
}

function Avatar({ name, size = 32 }) {
  return (
    <div
      className="rounded-full border-[3px] border-black flex items-center justify-center font-black uppercase text-white shrink-0"
      style={{ background: avatarColor(name || '?'), width: size, height: size, fontSize: size * 0.45 }}
    >
      {name?.[0] || '?'}
    </div>
  );
}

function IconBox({ choice, className = 'w-16 h-16 sm:w-20 sm:h-20' }) {
  return <div className={className}>{ICONS[choice] || ICONS.hidden}</div>;
}

export function ChatPanel({ messages = [], onSend, disabled }) {
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
    <div className="flex flex-col w-full h-[500px] lg:h-[700px] bg-[#333333] border-[3px] border-black rounded-lg shadow-[6px_6px_0px_#000] rotate-1 text-white">
      <div className="px-4 py-3 sm:py-4 border-b-[3px] border-black font-bold uppercase tracking-widest text-sm text-gray-200 bg-[#222] shrink-0">
        Room Chat
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 text-base sm:text-lg scrollbar-thin scrollbar-thumb-gray-600 bg-[#333]">
        {messages.length === 0 && (
          <p className="text-gray-400 text-center py-4 font-bold italic">No messages yet</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className={`break-words ${msg.playerId === 'SYSTEM' ? 'text-center my-3 bg-[#facc15] text-black border-[2px] border-black rounded p-3 shadow-[2px_2px_0px_#000]' : ''}`}>
            {msg.playerId !== 'SYSTEM' && (
              <span className="font-black text-[#facc15] tracking-wider uppercase">{msg.playerName}: </span>
            )}
            <span className={msg.playerId === 'SYSTEM' ? 'font-black text-xs sm:text-sm uppercase tracking-widest' : 'text-gray-100 font-medium'}>
              {msg.message}
            </span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-3 sm:p-4 border-t-[3px] border-black flex gap-3 bg-[#2a2a2a] rounded-b-lg shrink-0">
        <input
          type="text"
          className="py-3 px-4 text-base flex-1 bg-black border-[2px] border-black rounded text-white focus:outline-none focus:ring-2 focus:ring-[#facc15]"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          maxLength={500}
        />
        <button
          type="submit"
          className="bg-[#facc15] text-black text-base font-black uppercase border-[2px] border-black rounded px-6 py-3 shadow-[3px_3px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_#000] transition-all disabled:opacity-50 shrink-0"
          disabled={disabled}
        >
          Send
        </button>
      </form>
    </div>
  );
}

export default function Board() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [room, setRoom] = useState(location.state?.room ?? null);
  const [celebrating, setCelebrating] = useState(false);

  // Mobile chat notification states
  const [chatToast, setChatToast] = useState(null);
  const chatRef = useRef(null);

  // idle -> approaching -> impact -> reveal
  const [revealStage, setRevealStage] = useState('idle');
  const lastRoundRef = useRef(null);

  useEffect(() => {
    const socket = connectSocket();
    const username = localStorage.getItem('pohahub_username');
    if (!username) return navigate(`/games/stone-paper-scissor?join=${roomCode}`);

    const syncRoom = async () => {
      const res = await emitWithAck('room:join', { roomCode: roomCode.toUpperCase(), playerName: username });
      if (res.ok) setRoom(res.room);
    };

    const onRoomUpdate = (updatedRoom) => {
      if (updatedRoom.code === roomCode?.toUpperCase()) {
        if (updatedRoom.gameState?.status === 'won' && updatedRoom.gameState?.winner?.id === updatedRoom.viewerId) {
          setTimeout(() => runConfetti(), 300);
        }
        setRoom(updatedRoom);
      }
    };

    const onChatMessage = (msg) => {
      setRoom((prev) => prev ? { ...prev, chat: [...(prev.chat ?? []), msg] } : prev);
      
      // Trigger mobile toast if message isn't from me and screen is < 1024px
      if (msg.playerName !== username && window.innerWidth < 1024) {
        setChatToast(msg);
        setTimeout(() => setChatToast(null), 3500); // Hide after 3.5s
      }
    };

    socket.on('connect', syncRoom);
    socket.on('room:update', onRoomUpdate);
    socket.on('chat:message', onChatMessage);

    if (socket.connected) syncRoom();
    else socket.connect();

    return () => { 
      socket.off('connect', syncRoom); 
      socket.off('room:update', onRoomUpdate); 
      socket.off('chat:message', onChatMessage);
    };
  }, [roomCode, navigate]);

  // Drive the collide -> smoke -> reveal sequence whenever a new round result lands
  useEffect(() => {
    const gs = room?.gameState;
    if (!gs) return;
    if (gs.status === 'round-result') {
      if (lastRoundRef.current !== gs.currentRound) {
        lastRoundRef.current = gs.currentRound;
        setRevealStage('approaching');
      }
    } else {
      setRevealStage('idle');
    }
  }, [room?.gameState?.status, room?.gameState?.currentRound]);

  useEffect(() => {
    if (revealStage !== 'impact') return;
    const t = setTimeout(() => setRevealStage('reveal'), 750);
    return () => clearTimeout(t);
  }, [revealStage]);

  // Randomized smoke-puff layout, regenerated fresh for each round
  const puffs = useMemo(() => Array.from({ length: 8 }, (_, i) => ({
    id: i,
    dx: (Math.random() - 0.5) * 170,
    dy: -(Math.random() * 70 + 10),
    size: 46 + Math.random() * 54,
    delay: Math.random() * 0.12,
    duration: 0.65 + Math.random() * 0.35,
  })), [room?.gameState?.currentRound]);

  if (!room) return <div className="text-center py-24 text-black font-black uppercase text-xl animate-pulse">Connecting...</div>;

  const gameState = room.gameState;
  const myPlayerId = room.viewerId;
  const isHost = room.hostId === myPlayerId;
  const me = gameState?.players?.find(p => p.id === myPlayerId);
  const opponent = gameState?.players?.find(p => p.id !== myPlayerId);

  const handleStart = () => emitWithAck('room:start', {});
  const playMove = (choice) => emitWithAck('game:move', { action: 'play', choice });
  const nextRound = () => emitWithAck('game:move', { action: 'nextRound' });
  const resetGame = () => emitWithAck('game:reset');

  const handleChat = async (message) => {
    await emitWithAck('chat:message', { message });
  };

  const scrollToChat = () => {
    setChatToast(null);
    chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  function runConfetti() {
    setCelebrating(true);
    confetti({ particleCount: 120, spread: 70, origin: { y: 0.2 } });
    setTimeout(() => setCelebrating(false), 2500);
  }

  if (room.status === 'waiting') {
    // return <WaitingLobby roomCode={room.code} isHost={isHost} playerCount={room.players.length} onStart={handleStart} gamePath="stone-paper-scissor" />;
    
        return (
          <WaitingLobby
            roomCode={room.code}
            isHost={isHost}
            playerCount={room.players.length}
            players={room.players}
            onStart={handleStart}
            gamePath="stone-paper-scissor"
          />
        );
        console.log(room);
  }



  if (!gameState) {
    return <div className="text-center py-24 text-black font-black uppercase tracking-widest text-xl animate-pulse">Loading Match...</div>;
  }

  const colliding = revealStage === 'approaching' || revealStage === 'impact' || revealStage === 'reveal';
  const winnerId = gameState.roundWinnerId;
  const isTie = winnerId === 'tie';

  return (
    <div className="w-full max-w-[1600px] mx-auto px-[clamp(0.5rem,2vw,1.5rem)] py-[clamp(1rem,3vw,2rem)] relative font-sans">
      
      {/* INJECTED CSS FOR POPUP ANIMATION */}
      <style>{`
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.8) translateY(30px) rotate(-5deg); }
          100% { opacity: 1; transform: scale(1) translateY(0) rotate(-2deg); }
        }
        .animate-pop-in {
          animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
        }
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

      {/* MAIN SPLIT LAYOUT */}
      <div className="flex flex-col lg:flex-row gap-[clamp(1rem,3vw,2rem)] items-start">
        
        {/* LEFT COLUMN: GAME BOARD */}
        <div className="flex-1 w-full min-w-0">
          <div className="bg-gradient-to-r from-white to-gray-50 border-[4px] border-black shadow-[8px_8px_0px_#000] p-4 sm:p-6 rounded-lg -rotate-1 mb-8 flex justify-between items-center gap-4">
             <VoiceChat roomCode={room.code} />
            <div>
              <p className="text-xs font-black tracking-widest text-gray-500 uppercase">Best of 5</p>
              <AnimatePresence mode="wait">
                <motion.h2
                  key={gameState.currentRound}
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  className="text-2xl font-black uppercase text-[#ef4444]"
                >
                  Round {gameState.currentRound}
                </motion.h2>
              </AnimatePresence>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2">
                <Avatar name={me?.name} size={30} />
                <span className="font-black uppercase text-base sm:text-lg">{me?.score ?? 0}</span>
              </div>
              <span className="font-black text-gray-300 text-sm">vs</span>
              <div className="flex items-center gap-2">
                <span className="font-black uppercase text-base sm:text-lg">{opponent?.score ?? 0}</span>
                <Avatar name={opponent?.name || '?'} size={30} />
              </div>
            </div>
          </div>

          <AnimatePresence>
            {(gameState.status === 'won' || gameState.status === 'draw') ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 30, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ type: 'spring', stiffness: 220, damping: 18 }}
                className="bg-gradient-to-br from-yellow-300 to-amber-400 border-[4px] border-black shadow-[12px_12px_0px_#000] p-8 sm:p-10 text-center rounded-xl rotate-1"
              >
                <div className="text-6xl mb-2">{gameState.status === 'draw' ? '🤝' : '🏆'}</div>
                <h2 className="text-4xl sm:text-5xl font-black mb-2 uppercase">
                  {gameState.status === 'draw' ? "It's a Draw!" : `${gameState.winner.name} Wins!`}
                </h2>
                <p className="font-bold uppercase text-black/60 mb-6 text-sm sm:text-base">
                  Final score — {me?.name}: {me?.score} · {opponent?.name}: {opponent?.score}
                </p>
                <div className="flex flex-wrap justify-center gap-4">
                  {isHost && (
                    <button onClick={resetGame} className="bg-green-400 text-black font-black uppercase border-[3px] border-black py-3 px-8 rounded shadow-[4px_4px_0px_#000] transition-transform hover:translate-y-[2px] hover:translate-x-[2px]">Play Again</button>
                  )}
                  <Link to="/" className="bg-white text-black font-black uppercase border-[3px] border-black py-3 px-8 rounded shadow-[4px_4px_0px_#000] transition-transform hover:translate-y-[2px] hover:translate-x-[2px]">Exit</Link>
                </div>
              </motion.div>
            ) : (
              <motion.div key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <motion.div
                  animate={revealStage === 'impact' ? { x: [0, -10, 10, -7, 7, -3, 3, 0] } : { x: 0 }}
                  transition={{ duration: 0.45 }}
                  className="relative"
                >
                  <div className={`relative flex items-stretch min-h-[260px] sm:min-h-[320px] ${colliding ? 'justify-center gap-3 sm:gap-4' : 'justify-between gap-4'}`}>

                    {/* Opponent fighter */}
                    <motion.div
                      layout
                      transition={{ layout: { duration: 0.85, ease: [0.45, 0, 0.2, 1] } }}
                      onLayoutAnimationComplete={() => { if (revealStage === 'approaching') setRevealStage('impact'); }}
                      animate={{
                        scale: revealStage === 'reveal' ? (isTie ? 1 : winnerId === opponent?.id ? 1.06 : 0.94) : 1,
                        opacity: revealStage === 'reveal' && !isTie && winnerId !== opponent?.id ? 0.55 : 1,
                      }}
                      className={`w-36 sm:w-48 bg-gradient-to-br from-gray-100 to-gray-200 border-[4px] border-black shadow-[8px_8px_0px_#000] p-4 sm:p-6 text-center flex flex-col items-center justify-center rounded-lg rotate-1 ${revealStage === 'reveal' && !isTie && winnerId !== opponent?.id ? 'grayscale' : ''}`}
                      style={revealStage === 'reveal' && winnerId === opponent?.id ? { boxShadow: `8px 8px 0px #000, 0 0 0 4px ${CHOICE_COLORS[opponent?.currentChoice] || '#000'}` } : undefined}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Avatar name={opponent?.name} size={26} />
                        <h3 className="text-sm sm:text-xl font-black uppercase truncate max-w-[80px] sm:max-w-[130px]">{opponent?.name || 'Opponent'}</h3>
                      </div>
                      <IconBox choice={revealStage === 'idle' ? 'hidden' : (opponent?.currentChoice || 'hidden')} />
                      {revealStage === 'idle' && (
                        <p className="font-bold text-gray-500 uppercase mt-3 text-[10px] sm:text-sm">
                          {opponent?.currentChoice ? '🔒 Locked In' : 'Thinking…'}
                        </p>
                      )}
                    </motion.div>

                    {/* VS badge, only while both are still choosing */}
                    <AnimatePresence>
                      {revealStage === 'idle' && (
                        <motion.div
                          initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-black text-white font-black text-xs sm:text-sm uppercase rounded-full w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border-[3px] border-white shadow-[3px_3px_0px_#000] rotate-6 z-10"
                        >
                          VS
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Smoke + impact burst */}
                    <AnimatePresence>
                      {(revealStage === 'impact' || revealStage === 'reveal') && (
                        <motion.div
                          initial={{ opacity: 1 }} exit={{ opacity: 0 }}
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
                        >
                          {puffs.map(p => (
                            <motion.div
                              key={p.id}
                              className="absolute rounded-full"
                              style={{
                                width: p.size, height: p.size, marginLeft: -p.size / 2, marginTop: -p.size / 2,
                                background: 'radial-gradient(circle, rgba(255,255,255,0.95) 0%, rgba(170,170,180,0.55) 55%, rgba(170,170,180,0) 100%)',
                                filter: 'blur(3px)',
                              }}
                              initial={{ x: 0, y: 0, scale: 0.2, opacity: 0 }}
                              animate={revealStage === 'impact'
                                ? { x: p.dx, y: p.dy, scale: 1.2, opacity: [0, 0.9, 0.75] }
                                : { x: p.dx * 1.5, y: p.dy * 1.8, scale: 1.6, opacity: 0 }}
                              transition={{ duration: p.duration, delay: p.delay, ease: 'easeOut' }}
                            />
                          ))}
                          <motion.div
                            className="absolute rounded-full border-[5px] border-black/70"
                            style={{ width: 10, height: 10, marginLeft: -5, marginTop: -5 }}
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{ scale: revealStage === 'impact' ? 13 : 17, opacity: 0 }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                          />
                          {revealStage === 'impact' && (
                            <motion.div
                              initial={{ scale: 0, rotate: -8, opacity: 0 }}
                              animate={{ scale: [0, 1.25, 1], rotate: [-8, 4, -2], opacity: [0, 1, 1] }}
                              transition={{ duration: 0.4 }}
                              className="absolute -translate-x-1/2 -translate-y-1/2 bg-white border-[3px] border-black rounded-full px-4 py-1 font-black uppercase text-xs sm:text-sm shadow-[3px_3px_0px_#000] whitespace-nowrap"
                            >
                              Clash!
                            </motion.div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Player fighter */}
                    <motion.div
                      layout
                      transition={{ layout: { duration: 0.85, ease: [0.45, 0, 0.2, 1] } }}
                      animate={{
                        scale: revealStage === 'reveal' ? (isTie ? 1 : winnerId === me?.id ? 1.06 : 0.94) : 1,
                        opacity: revealStage === 'reveal' && !isTie && winnerId !== me?.id ? 0.55 : 1,
                      }}
                      className={`w-36 sm:w-48 bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] p-4 sm:p-6 text-center flex flex-col items-center justify-center rounded-lg -rotate-1 ${revealStage === 'reveal' && !isTie && winnerId !== me?.id ? 'grayscale' : ''}`}
                      style={revealStage === 'reveal' && winnerId === me?.id ? { boxShadow: `8px 8px 0px #000, 0 0 0 4px ${CHOICE_COLORS[me?.currentChoice] || '#000'}` } : undefined}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Avatar name={me?.name} size={26} />
                        <h3 className="text-sm sm:text-xl font-black uppercase">You</h3>
                      </div>

                      <IconBox choice={me?.currentChoice || 'hidden'} />
                      
                      {me?.currentChoice ? (
                        revealStage === 'idle' && (
                          <p className="font-black text-green-500 text-[10px] sm:text-sm uppercase tracking-widest bg-black px-3 py-1 rounded mt-3">Choice Locked</p>
                        )
                      ) : (
                        <p className="font-bold text-gray-500 uppercase mt-3 text-[10px] sm:text-sm animate-pulse">
                          Your Turn...
                        </p>
                      )}
                    </motion.div>
                  </div>
                </motion.div>

                {/* THE NEW CHOOSING ACTION BAR */}
                {!me?.currentChoice && gameState.status === 'playing' && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="mt-6 sm:mt-10 flex justify-center"
                  >
                    <div className="bg-gradient-to-r from-white to-gray-50 border-[4px] border-black shadow-[8px_8px_0px_#000] p-4 sm:p-6 rounded-xl rotate-1 flex gap-4 sm:gap-8">
                      {['stone', 'paper', 'scissor'].map(choice => (
                        <motion.button
                          key={choice}
                          onClick={() => playMove(choice)}
                          className="bg-white border-[3px] border-black p-3 sm:p-5 rounded shadow-[5px_5px_0px_#000] focus:outline-none focus:ring-4 focus:ring-indigo-200"
                          whileHover={{ scale: 1.1, y: -4 }}
                          whileTap={{ scale: 0.95 }}
                          aria-label={`Play ${choice}`}
                        >
                          <div className="flex flex-col items-center">
                            <IconBox choice={choice} className="w-12 h-12 sm:w-16 sm:h-16 mb-2" />
                            <span className="text-xs sm:text-sm font-black uppercase tracking-widest">{choice}</span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Round outcome banner */}
                <div className="mt-8 text-center min-h-[90px] flex flex-col items-center justify-center">
                  {revealStage === 'approaching' && (
                    <p className="font-black uppercase tracking-widest text-gray-400 animate-pulse">Brace yourselves…</p>
                  )}
                  {revealStage === 'reveal' && (
                    <>
                      <motion.h3
                        initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                        className="text-2xl sm:text-3xl font-black uppercase mb-4"
                        style={{ color: isTie ? '#6b7280' : '#ef4444' }}
                      >
                        {isTie ? "Round Tie!" : winnerId === me?.id ? "You Won the Round!" : "Opponent Won!"}
                      </motion.h3>
                      {isHost ? (
                        <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} onClick={nextRound} className="bg-yellow-400 border-[3px] border-black px-6 py-2 shadow-[4px_4px_0px_#000] font-black uppercase rounded">Start Next Round</motion.button>
                      ) : (
                        <p className="text-sm font-bold text-gray-500 uppercase">Waiting for host…</p>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* RIGHT COLUMN: CHAT PANEL */}
        <div ref={chatRef} className="w-full lg:w-80 2xl:w-96 flex flex-col shrink-0 mt-4 lg:mt-0 scroll-mt-24">
          <ChatPanel
            messages={room.chat ?? []}
            onSend={handleChat}
            disabled={!room}
          />
        </div>

      </div>

      <AnimatePresence>
        {celebrating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-0 z-50"></motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}