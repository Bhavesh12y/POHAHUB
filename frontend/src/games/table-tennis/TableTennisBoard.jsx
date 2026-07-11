import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby';
import VoiceChat from '../../components/VoiceChat';

const GAME_WIDTH = 1000;
const GAME_HEIGHT = 600;
const BALL_RADIUS = 12;
const RACKET_RADIUS = 40;

// ---------- Chat Panel (unchanged) ----------
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
      <div className="px-4 py-3 border-b-[3px] border-black font-bold uppercase tracking-widest text-xs text-gray-200 bg-[#222] shrink-0">
        Room Chat
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 text-sm scrollbar-thin scrollbar-thumb-gray-600 bg-[#333]">
        {messages.length === 0 && <p className="text-gray-400 text-center py-4 font-bold italic">No messages yet</p>}
        {messages.map((msg) => (
          <div key={msg.id} className={`break-words ${msg.playerId === 'SYSTEM' ? 'text-center my-3 bg-[#f9a8d4] text-black border-[2px] border-black rounded p-2 shadow-[2px_2px_0px_#000]' : ''}`}>
            {msg.playerId !== 'SYSTEM' && <span className="font-black text-[#facc15] tracking-wider uppercase">{msg.playerName}: </span>}
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
  const [myRole, setMyRole] = useState(null);
  const [countdown, setCountdown] = useState(null);
  const [scoreState, setScoreState] = useState({ p1: 0, p2: 0 });
  const [gameStatus, setGameStatus] = useState(null);
  const [winner, setWinner] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const socket = connectSocket();
  const username = localStorage.getItem('pohahub_username');
  const myPlayerId = socket.id;
  const isHost = room?.hostId === myPlayerId;

  // Interpolation & rendering refs
  const prevStateRef = useRef(null);
  const currentStateRef = useRef(null);
  const animFrameRef = useRef(null);
  const trailRef = useRef([]);
  const moveThrottleRef = useRef(0);

  // ---------- Canvas drawing (independent of React) ----------
  const drawFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Interpolation
    const now = performance.now();
    const prev = prevStateRef.current;
    const curr = currentStateRef.current;
    let interpState = curr;
    if (prev && curr && prev.timestamp && curr.timestamp) {
      const elapsed = now - curr.timestamp;
      const frameTime = curr.timestamp - prev.timestamp;
      const t = Math.min(1, Math.max(0, elapsed / frameTime));
      interpState = {
        ball: {
          x: prev.ball.x + (curr.ball.x - prev.ball.x) * t,
          y: prev.ball.y + (curr.ball.y - prev.ball.y) * t,
        },
        paddles: {
          p1: {
            x: prev.paddles.p1.x + (curr.paddles.p1.x - prev.paddles.p1.x) * t,
            y: prev.paddles.p1.y + (curr.paddles.p1.y - prev.paddles.p1.y) * t,
          },
          p2: {
            x: prev.paddles.p2.x + (curr.paddles.p2.x - prev.paddles.p2.x) * t,
            y: prev.paddles.p2.y + (curr.paddles.p2.y - prev.paddles.p2.y) * t,
          },
        },
      };
    }

    if (!interpState) return;

    // Background
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, '#0f172a');
    bg.addColorStop(1, '#1e293b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Floor
    ctx.fillStyle = '#020617';
    ctx.fillRect(0, h - 20, w, 20);

    // Table
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(100, 450, 800, 20);
    ctx.fillStyle = '#3b82f6';
    ctx.fillRect(100, 450, 800, 5);
    ctx.fillStyle = '#475569';
    ctx.fillRect(150, 470, 15, h - 470 - 20);
    ctx.fillRect(835, 470, 15, h - 470 - 20);

    // Net
    ctx.fillStyle = '#94a3b8';
    ctx.fillRect(w / 2 - 4, 370, 8, 80);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(w / 2 - 5, 370, 10, 5);

    // Trail
    ctx.save();
    trailRef.current.forEach((pos, i) => {
      const alpha = (i + 1) / trailRef.current.length;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, BALL_RADIUS * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(250, 204, 21, ${alpha * 0.5})`;
      ctx.fill();
    });
    ctx.restore();

    // Ball
    ctx.beginPath();
    ctx.arc(interpState.ball.x, interpState.ball.y, BALL_RADIUS, 0, Math.PI * 2);
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

    drawRacket(interpState.paddles.p1, '#3b82f6', true);
    drawRacket(interpState.paddles.p2, '#ef4444', false);

    animFrameRef.current = requestAnimationFrame(drawFrame);
  }, []);

  // Start / stop the render loop
  useEffect(() => {
    if (gameStatus === 'playing') {
      animFrameRef.current = requestAnimationFrame(drawFrame);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [gameStatus, drawFrame]);

  // Handle incoming server state
  const updateState = useCallback((state) => {
    // Update trail
    if (state.ball) {
      trailRef.current.push({ x: state.ball.x, y: state.ball.y });
      if (trailRef.current.length > 8) trailRef.current.shift();
    }

    prevStateRef.current = currentStateRef.current;
    currentStateRef.current = {
      ...state,
      timestamp: state.timestamp || performance.now(),
    };

    // Update React‑visible parts only when they actually change
    if (state.status !== gameStatus) setGameStatus(state.status);
    if (state.score && (state.score.p1 !== scoreState.p1 || state.score.p2 !== scoreState.p2))
      setScoreState(state.score);
    if (state.winner !== winner) setWinner(state.winner);
  }, [gameStatus, scoreState, winner]);

  // ---------- Socket & room setup (unchanged) ----------
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

    const onRole = ({ role }) => setMyRole(role);
    const onGameState = (state) => updateState(state);
    const onCountdown = (count) => {
      setCountdown(count);
      trailRef.current = [];
    };

    socket.on('tt:role', onRole);
    socket.on('tt:gameState', onGameState);
    socket.on('tt:countdown', onCountdown);

    return () => {
      socket.off('tt:role', onRole);
      socket.off('tt:gameState', onGameState);
      socket.off('tt:countdown', onCountdown);
    };
  }, [room?.status, roomCode, myPlayerId, username, socket, updateState]);

  // ---------- Actions ----------
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

  // ---------- Pointer controls (throttled) ----------
  const processPointerMove = (e) => {
    if (gameStatus !== 'playing' || !canvasRef.current || !myRole) return;
    const now = performance.now();
    if (now - moveThrottleRef.current < 20) return;
    moveThrottleRef.current = now;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = GAME_WIDTH / rect.width;
    const scaleY = GAME_HEIGHT / rect.height;

    const clientX = e.clientX ?? (e.touches?.[0]?.clientX);
    const clientY = e.clientY ?? (e.touches?.[0]?.clientY);
    if (clientX === undefined || clientY === undefined) return;

    const relativeX = (clientX - rect.left) * scaleX;
    const relativeY = (clientY - rect.top) * scaleY;

    socket.emit('tt:move', {
      roomId: roomCode.toUpperCase(),
      pos: { x: relativeX, y: relativeY },
    });
  };

  const handlePointerDown = (e) => {
    if (gameStatus !== 'playing') return;
    setIsDragging(true);
    try { e.target.setPointerCapture(e.pointerId); } catch (err) {}
    processPointerMove(e);
  };

  const handlePointerMove = (e) => {
    if (!isDragging) return;
    processPointerMove(e);
  };

  const handlePointerUp = (e) => {
    setIsDragging(false);
    try { e.target.releasePointerCapture(e.pointerId); } catch (err) {}
  };

  // ---------- UI helpers ----------
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
      {/* Match Finished Popup */}
      {gameStatus === 'finished' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-md bg-white border-[4px] border-black shadow-[12px_12px_0px_#000] p-10 text-center animate-pop-in rounded-xl -rotate-2">
            <div className="relative z-10 text-black">
              <div className="text-sm font-bold tracking-widest uppercase text-gray-500 mb-2">Match Concluded</div>
              <h2 className="text-[clamp(2.5rem,5vw,3.5rem)] font-black mb-2 text-[#22d3ee] tracking-tighter uppercase leading-none" style={{ WebkitTextStroke: '2px black' }}>
                {winner === myRole ? 'You Won!' : 'You Lost'}
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

      <div className="flex flex-col lg:flex-row gap-[clamp(1rem,3vw,2rem)] items-stretch">
        {/* Game Column */}
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

            {room.status === 'playing' && !currentStateRef.current && (
              <div className="text-center font-black uppercase text-2xl py-20 animate-pulse text-white">
                Syncing Table...
              </div>
            )}

            {(room.status === 'playing' || gameStatus === 'finished') && (
              <div className="w-full mt-4 max-w-[900px] mx-auto">
                {/* Scoreboard */}
                <div className="flex justify-between items-center bg-white border-[4px] border-black p-4 mb-6 shadow-[8px_8px_0px_#000] rotate-1 text-black">
                  <div className="text-center w-1/3">
                    <p className={`text-sm font-bold uppercase ${leftColor}`}>{getPlayerLabel('p1')}</p>
                    <p className="text-4xl font-black">{scoreState[leftPlayer]}</p>
                  </div>
                  <div className="text-center w-1/3">
                    <p className="text-xs font-bold tracking-widest uppercase text-gray-500 mb-1">Score</p>
                    <p className="text-2xl font-black bg-[#22d3ee] px-4 py-1 border-[3px] border-black shadow-[4px_4px_0px_#000] inline-block">VS</p>
                  </div>
                  <div className="text-center w-1/3">
                    <p className={`text-sm font-bold uppercase ${rightColor}`}>{getPlayerLabel('p2')}</p>
                    <p className="text-4xl font-black">{scoreState[rightPlayer]}</p>
                  </div>
                </div>

                {/* Canvas */}
                <div
                  className={`relative w-full aspect-[10/6] bg-black border-[4px] border-black shadow-[12px_12px_0px_#000] -rotate-1 overflow-hidden touch-none select-none transition-colors duration-200 ${
                    isDragging ? 'cursor-grabbing' : 'cursor-grab'
                  }`}
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
                  {gameStatus === 'countdown' && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
                      <h1 className="text-[10rem] font-black text-[#facc15] animate-bounce" style={{ WebkitTextStroke: '6px black' }}>
                        {countdown > 0 ? countdown : 'SERVE!'}
                      </h1>
                    </div>
                  )}
                </div>

                {/* Subtle control hint (no more vibrating box) */}
                <p className="text-center text-xs font-bold uppercase tracking-widest mt-4 text-gray-400">
                  🏓 Hold & drag to move your racket
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Chat Panel */}
        <div className="w-full lg:w-80 2xl:w-96 flex flex-col shrink-0 mt-4 lg:mt-0">
          <ChatPanel messages={room.chat ?? []} onSend={handleChat} disabled={!connected} />
        </div>
      </div>
    </div>
  );
}