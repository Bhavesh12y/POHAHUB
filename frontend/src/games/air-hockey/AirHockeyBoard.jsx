import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby';
import VoiceChat from '../../components/VoiceChat';

// Reusable Chat Panel (With Scrollbar Fix & Crash Protection)
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

export default function AirHockeyBoard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Standard Room Sync State
  const [room, setRoom] = useState(location.state?.room ?? null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  // Air Hockey Gameplay State
  const canvasRef = useRef(null);
  const gameStateRef = useRef(null); // Used for high-speed physics
  const [uiState, setUiState] = useState({ score: { p1: 0, p2: 0 }, status: 'playing' });
  const [countdown, setCountdown] = useState(null);
  const [showGoal, setShowGoal] = useState(false);

  const myPlayerId = room?.viewerId;
  const isPlaying = room?.status === 'playing';
  const isHost = room?.hostId === myPlayerId;

  // Socket Connection & Standard Lifecycle
  useEffect(() => {
    const socket = connectSocket();
    const username = localStorage.getItem('pohahub_username');

    if (!username) {
      navigate(`/games/air-hockey?join=${roomCode}`);
      return;
    }

    const syncRoom = async () => {
      if (!username || !roomCode) return;
      const result = await emitWithAck('room:join', {
        roomCode: roomCode.toUpperCase(),
        playerName: username,
      });
      if (result.ok) {
        setRoom(result.room);
      } else if (!location.state?.room) {
        setError(result.error || 'Could not join room');
      }
    };

    const onConnect = () => {
      setConnected(true);
      syncRoom();
    };

    const onDisconnect = () => setConnected(false);

    const onRoomUpdate = (updatedRoom) => {
      if (updatedRoom.code === roomCode?.toUpperCase()) {
        setRoom(updatedRoom);
      }
    };

    const onChatMessage = (msg) => {
      setRoom((prev) => prev ? { ...prev, chat: [...(prev.chat ?? []), msg] } : prev);
    };

    const onRoomClosed = () => {
      setError('Room was closed');
      setTimeout(() => navigate('/games/air-hockey'), 2000);
    };

    // Air Hockey High-Frequency Socket Events
    const onHighFreqGameState = (state) => {
      gameStateRef.current = state;
      setUiState((prev) => {
        if (prev.status !== state.status || prev.score.p1 !== state.score.p1 || prev.score.p2 !== state.score.p2) {
          return { score: state.score, status: state.status, winner: state.winner };
        }
        return prev;
      });
    };

    const onCountdown = (count) => setCountdown(count === 0 ? null : count);
    const onGoalAnimation = () => {
      setShowGoal(true);
      setTimeout(() => setShowGoal(false), 1500);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:update', onRoomUpdate);
    socket.on('chat:message', onChatMessage);
    socket.on('room:closed', onRoomClosed);
    socket.on('gameState', onHighFreqGameState);
    socket.on('countdown', onCountdown);
    socket.on('goalAnimation', onGoalAnimation);

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
      socket.off('room:closed', onRoomClosed);
      socket.off('gameState', onHighFreqGameState);
      socket.off('countdown', onCountdown);
      socket.off('goalAnimation', onGoalAnimation);
    };
  }, [roomCode, navigate, location.state]);

  // 60FPS Canvas Render Loop (Bypasses React DOM)
  useEffect(() => {
    let animationId;
    const renderLoop = () => {
      if (gameStateRef.current && canvasRef.current && isPlaying) {
        renderGame(gameStateRef.current, canvasRef.current);
      }
      animationId = requestAnimationFrame(renderLoop);
    };
    renderLoop();
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying]);

  const handlePointerMove = (e) => {
    if (!gameStateRef.current || gameStateRef.current.status !== 'playing' || !isPlaying) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const socket = connectSocket();
    socket.emit('airHockeyMove', { roomId: roomCode, position: { x, y } });
  };

  const renderGame = (state, canvas) => {
    const ctx = canvas.getContext('2d');

    // Board Background
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Center Line & Circle
    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
    ctx.stroke();

    // Goals
    ctx.fillStyle = '#ef4444'; // Red
    ctx.fillRect(canvas.width / 2 - 60, 0, 120, 15);
    ctx.fillStyle = '#3b82f6'; // Blue
    ctx.fillRect(canvas.width / 2 - 60, canvas.height - 15, 120, 15);

    // Puck
    ctx.fillStyle = '#0f172a';
    ctx.beginPath();
    ctx.arc(state.puck.x, state.puck.y, 15, 0, Math.PI * 2);
    ctx.fill();

    // P1 Blue Striker (Bottom)
    ctx.fillStyle = '#3b82f6'; 
    ctx.beginPath();
    ctx.arc(state.strikers.p1.x, state.strikers.p1.y, 25, 0, Math.PI * 2);
    ctx.fill();

    // P2 Red Striker (Top)
    ctx.fillStyle = '#ef4444'; 
    ctx.beginPath();
    ctx.arc(state.strikers.p2.x, state.strikers.p2.y, 25, 0, Math.PI * 2);
    ctx.fill();
  };

  // Standard Standard Room Actions
  const handleStart = async () => {
    setError('');
    const result = await emitWithAck('room:start', {});
    if (!result.ok) setError(result.error);
  };

  const handlePlayAgain = async () => {
    setError('');
    const result = await emitWithAck('game:reset', {});
    if (!result.ok) setError(result.error || 'Failed to start a new game');
  };

  const handleChat = async (message) => {
    await emitWithAck('chat:message', { message });
  };

  if (!room) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] p-10 rounded-lg max-w-md mx-auto -rotate-1">
          <div className="animate-pulse text-gray-500 font-bold mb-2 tracking-widest uppercase text-sm">Connecting to room...</div>
          <p className="text-3xl text-black font-black font-mono">{roomCode}</p>
          {!connected && <p className="text-sm text-[#ef4444] font-bold mt-4">Server connection failed.</p>}
        </div>
      </div>
    );
  }

  const statusMessage = room.status === 'waiting' 
    ? `Waiting for players (${room.players.length}/${room.maxPlayers})` 
    : uiState.status === 'finished' 
    ? 'Game Over' 
    : 'Match in Progress';

  return (
    <div className="w-full max-w-[1600px] mx-auto px-[clamp(0.5rem,2vw,1.5rem)] py-[clamp(1rem,3vw,2rem)] relative font-sans">
      
      <style>{`
        @keyframes popIn {
          0% { opacity: 0; transform: scale(0.8) translateY(30px) rotate(-5deg); }
          100% { opacity: 1; transform: scale(1) translateY(0) rotate(-2deg); }
        }
        .animate-pop-in { animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>

      {/* PREMIUM CELEBRATION POPUP */}
      {uiState.status === 'finished' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300" />
          <div className="relative w-full max-w-md bg-white border-[4px] border-black shadow-[12px_12px_0px_#000] p-10 text-center animate-pop-in rounded-xl -rotate-2">
            
            <div className="relative z-10 text-black">
              <div className="text-sm font-bold tracking-widest uppercase text-gray-500 mb-2">Match Concluded</div>
              <h2 className="text-[clamp(2rem,6vw,3.5rem)] font-black mb-2 tracking-tighter uppercase" style={{ WebkitTextStroke: '2px black', color: uiState.winner === 'p1' ? '#3b82f6' : '#ef4444' }}>
                {uiState.winner === 'p1' ? 'Blue (P1)' : 'Red (P2)'}
              </h2>
              <h3 className="text-2xl font-bold mb-8 uppercase">claims the victory!</h3>
              
              <div className="w-full h-[3px] bg-black mb-8" />
              
              <div className="flex flex-col gap-3">
                <button 
                  onClick={handlePlayAgain}
                  className="bg-[#facc15] w-full block py-4 text-sm font-black tracking-widest uppercase border-[3px] border-black shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] text-black transition-all duration-150 rounded"
                >
                  Play Again
                </button>
                <Link 
                  to="/games/air-hockey" 
                  className="bg-gray-200 w-full block py-4 text-sm font-bold tracking-widest uppercase border-[3px] border-black shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] text-black text-center transition-all duration-150 rounded"
                >
                  Return to Hub
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MAIN SPLIT LAYOUT */}
      <div className="flex flex-col lg:flex-row gap-[clamp(1rem,3vw,2rem)] items-stretch">
        
        {/* LEFT COLUMN: GAME OR LOBBY */}
        <div className="flex-1 w-full min-w-0 flex flex-col">
          <div className="bg-[#333333] border-[3px] border-black rounded-lg p-6 sm:p-8 shadow-[8px_8px_0px_#000] -rotate-1 text-white">
            
            {/* Header Info */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border-b-[3px] border-black pb-6">
              <div>
                <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-1">Room Code</p>
                <p className="text-[clamp(1.5rem,4vw,2.25rem)] font-black tracking-widest text-white uppercase">{room.code}</p>
              </div>
              <VoiceChat roomCode={room.code} />
              <div className="text-right">
                <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-1">Status</p>
                <p className="font-black text-[#facc15] text-[clamp(0.8rem,2vw,1rem)] uppercase">{statusMessage}</p>
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
                gamePath="air-hockey/room"
              />
            )}

            {/* AIR HOCKEY BOARD */}
            {isPlaying && (
              <div className="mx-auto w-full max-w-[420px] mt-4 flex flex-col items-center">
                <div className="flex w-full justify-between px-4 py-3 bg-white border-[3px] border-black shadow-[4px_4px_0px_#000] rounded mb-4 font-black text-xl uppercase rotate-1">
                  <div className="text-[#3b82f6]">P1 Score: {uiState.score.p1}</div>
                  <div className="text-[#ef4444]">P2 Score: {uiState.score.p2}</div>
                </div>

                <div className="relative border-[4px] border-black bg-white p-2 shadow-[8px_8px_0px_#000] rounded-xl -rotate-1">
                  
                  {/* Overlays */}
                  {countdown && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded-xl">
                      <span className="text-[6rem] font-black text-black animate-pop-in">{countdown}</span>
                    </div>
                  )}
                  {showGoal && (
                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 z-10 rounded-xl">
                      <span className="text-5xl font-black text-[#ef4444] uppercase tracking-widest bg-[#facc15] border-[3px] border-black shadow-[4px_4px_0px_#000] px-6 py-2 rotate-[-5deg] animate-pop-in">GOAL!</span>
                    </div>
                  )}

                  <canvas
                    ref={canvasRef}
                    width={400}
                    height={600}
                    onPointerMove={handlePointerMove}
                    onPointerDown={handlePointerMove}
                    className="cursor-crosshair touch-none block max-w-full h-auto rounded"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: CHAT PANEL */}
        <div className="w-full lg:w-80 2xl:w-96 flex flex-col shrink-0 mt-4 lg:mt-0">
          <ChatPanel messages={room.chat ?? []} onSend={handleChat} disabled={!connected} />
        </div>
      </div>
    </div>
  );
}