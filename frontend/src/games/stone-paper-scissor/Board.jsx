import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';

const ICONS = {
  stone: (
    <svg viewBox="0 0 64 64" className="w-20 h-20">
      <defs>
        <linearGradient id="gRock" x1="0" x2="1">
          <stop offset="0" stopColor="#9ca3ff" />
          <stop offset="1" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      <path fill="url(#gRock)" d="M8 36c0-12 8-20 20-20s20 8 28 20-8 20-28 20S8 48 8 36z"/>
    </svg>
  ),
  paper: (
    <svg viewBox="0 0 64 64" className="w-20 h-20">
      <defs>
        <linearGradient id="gPaper" x1="0" x2="1">
          <stop offset="0" stopColor="#fff7ed" />
          <stop offset="1" stopColor="#f97316" />
        </linearGradient>
      </defs>
      <rect x="10" y="8" width="44" height="48" rx="4" fill="url(#gPaper)"/>
      <line x1="18" y1="20" x2="46" y2="20" stroke="#fff" strokeWidth="2" />
      <line x1="18" y1="28" x2="46" y2="28" stroke="#fff" strokeWidth="2" />
    </svg>
  ),
  scissor: (
    <svg viewBox="0 0 64 64" className="w-20 h-20">
      <defs>
        <linearGradient id="gScissor" x1="0" x2="1">
          <stop offset="0" stopColor="#86efac" />
          <stop offset="1" stopColor="#10b981" />
        </linearGradient>
      </defs>
      <path d="M12 52 L28 36 L44 52" stroke="url(#gScissor)" strokeWidth="4" strokeLinecap="round" fill="none"/>
      <circle cx="20" cy="20" r="8" fill="url(#gScissor)"/>
      <circle cx="44" cy="20" r="8" fill="url(#gScissor)"/>
    </svg>
  ),
  hidden: (
    <svg viewBox="0 0 64 64" className="w-20 h-20">
      <circle cx="32" cy="32" r="28" fill="#111827" />
      <text x="32" y="38" textAnchor="middle" fontSize="20" fill="#f9fafb" fontWeight="700">?</text>
    </svg>
  )
};

export default function Board() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [room, setRoom] = useState(location.state?.room ?? null);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    const socket = connectSocket();
    const username = sessionStorage.getItem('pohahub_username');
    if (!username) return navigate(`/games/stone-paper-scissor?join=${roomCode}`);

    const syncRoom = async () => {
      const res = await emitWithAck('room:join', { roomCode: roomCode.toUpperCase(), playerName: username });
      if (res.ok) setRoom(res.room);
    };

    socket.on('connect', syncRoom);
    socket.on('room:update', (updatedRoom) => {
      if (updatedRoom.code === roomCode?.toUpperCase()) {
        // trigger celebration when a winner appears
        if (updatedRoom.gameState?.status === 'won' && updatedRoom.gameState?.winner?.id === updatedRoom.viewerId) {
          setTimeout(() => runConfetti(), 300);
        }
        setRoom(updatedRoom);
      }
    });

    if (socket.connected) syncRoom();
    else socket.connect();

    return () => { socket.off('connect'); socket.off('room:update'); };
  }, [roomCode, navigate]);

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

  function runConfetti() {
    setCelebrating(true);
    confetti({
      particleCount: 120,
      spread: 70,
      origin: { y: 0.2 }
    });
    setTimeout(() => setCelebrating(false), 2500);
  }

  if (room.status === 'waiting') {
    return <WaitingLobby roomCode={room.code} isHost={isHost} playerCount={room.players.length} onStart={handleStart} gamePath="stone-paper-scissor" />;
  }

  if (!gameState) {
    return <div className="text-center py-24 text-black font-black uppercase tracking-widest text-xl animate-pulse">Loading Match...</div>;
  }

  const choiceVariants = {
    idle: { scale: 1, y: 0 },
    hover: { scale: 1.06, y: -6 },
    tap: { scale: 0.96 }
  };

  const cardFlip = {
    front: { rotateY: 0, transition: { duration: 0.6 } },
    back: { rotateY: 180, transition: { duration: 0.6 } }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans">
      <div className="bg-gradient-to-r from-white to-gray-50 border-[4px] border-black shadow-[8px_8px_0px_#000] p-6 rounded-lg -rotate-1 mb-8 flex justify-between items-center">
        <div>
          <p className="text-xs font-black tracking-widest text-gray-500 uppercase">Best of 3</p>
          <h2 className="text-2xl font-black uppercase text-[#ef4444]">Round {gameState.currentRound}</h2>
        </div>
        <div className="text-right">
          <p className="text-xs font-black tracking-widest text-gray-500 uppercase">Scoreboard</p>
          <p className="text-xl font-bold uppercase">{me?.name}: {me?.score} | {opponent?.name || 'Waiting'}: {opponent?.score || 0}</p>
        </div>
      </div>

      <AnimatePresence>
        {(gameState.status === 'won' || gameState.status === 'draw') ? (
          <motion.div key="result" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="bg-gradient-to-r from-yellow-400 to-yellow-300 border-[4px] border-black shadow-[12px_12px_0px_#000] p-10 text-center rounded-xl rotate-1">
            <h2 className="text-5xl font-black mb-4 uppercase">
              {gameState.status === 'draw' ? "It's a Draw!" : `${gameState.winner.name} Wins!`}
            </h2>
            <div className="flex justify-center gap-4 mt-8">
              {isHost && (
                <button onClick={resetGame} className="bg-green-400 text-black font-black uppercase border-[3px] border-black py-3 px-8 rounded shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px]">Play Again</button>
              )}
              <Link to="/" className="bg-white text-black font-black uppercase border-[3px] border-black py-3 px-8 rounded shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px]">Exit</Link>
            </div>
          </motion.div>
        ) : (
          <motion.div key="play" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Opponent Card */}
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 border-[4px] border-black shadow-[8px_8px_0px_#000] p-8 text-center flex flex-col items-center justify-center min-h-[300px] rounded-lg rotate-1 perspective">
              <h3 className="text-xl font-black uppercase mb-4">{opponent?.name || 'Opponent'}</h3>
              <motion.div className="relative w-40 h-40" initial="front" animate={opponent?.currentChoice ? "back" : "front"} variants={cardFlip}>
                <motion.div className="absolute inset-0 bg-white rounded-lg flex items-center justify-center backface-hidden shadow-inner" style={{ transform: 'rotateY(0deg)' }}>
                  {opponent?.currentChoice ? ICONS[opponent.currentChoice] : ICONS.hidden}
                </motion.div>
                <motion.div className="absolute inset-0 bg-gray-800 rounded-lg flex items-center justify-center text-white backface-hidden" style={{ transform: 'rotateY(180deg)' }}>
                  {opponent?.currentChoice ? ICONS[opponent.currentChoice] : ICONS.hidden}
                </motion.div>
              </motion.div>
              <p className="font-bold text-gray-500 uppercase mt-4">{opponent?.currentChoice ? 'Choice Locked' : 'Thinking...'}</p>
            </div>

            {/* Player Card */}
            <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] p-8 text-center flex flex-col items-center justify-center min-h-[300px] rounded-lg -rotate-1">
              <h3 className="text-xl font-black uppercase mb-4">You <span className="text-sm font-normal">({me?.name})</span></h3>

              {gameState.status === 'round-result' ? (
                <>
                  <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="text-[5rem] mb-4">
                    {ICONS[me?.currentChoice]}
                  </motion.div>

                  <motion.h3 initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="text-2xl font-black text-[#ef4444] uppercase mb-4">
                    {gameState.roundWinnerId === 'tie' ? "Round Tie!" : gameState.roundWinnerId === me.id ? "You Won the Round!" : "Opponent Won!"}
                  </motion.h3>

                  {isHost ? (
                    <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.98 }} onClick={nextRound} className="bg-yellow-400 border-[3px] border-black px-6 py-2 shadow-[4px_4px_0px_#000] font-black uppercase mt-4">Start Next Round</motion.button>
                  ) : (
                    <p className="text-sm font-bold text-gray-500 uppercase mt-4">Waiting for host...</p>
                  )}
                </>
              ) : (
                <>
                  <motion.div className="text-[5rem] mb-6">{me?.currentChoice ? ICONS[me.currentChoice] : ICONS.hidden}</motion.div>

                  {!me?.currentChoice ? (
                    <div className="flex gap-4" role="list">
                      {['stone', 'paper', 'scissor'].map(choice => (
                        <motion.button
                          key={choice}
                          onClick={() => playMove(choice)}
                          className="bg-gradient-to-br from-white to-gray-100 border-[3px] border-black p-4 rounded shadow-[6px_6px_0px_#000] focus:outline-none focus:ring-4 focus:ring-indigo-200"
                          variants={choiceVariants}
                          initial="idle"
                          whileHover="hover"
                          whileTap="tap"
                          aria-label={`Play ${choice}`}
                        >
                          <div className="flex flex-col items-center">
                            <div className="mb-2">{ICONS[choice]}</div>
                            <span className="text-xs font-black uppercase tracking-widest">{choice}</span>
                          </div>
                        </motion.button>
                      ))}
                    </div>
                  ) : (
                    <p className="font-black text-green-500 text-xl uppercase tracking-widest bg-black px-4 py-2 rounded">Choice Locked</p>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* optional celebration overlay */}
      <AnimatePresence>
        {celebrating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pointer-events-none fixed inset-0 z-50"></motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
