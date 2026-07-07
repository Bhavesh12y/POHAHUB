import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby';
import VoiceChat from '../../components/VoiceChat';

// --- CONSTANTS (mirrored from server) ---
const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const PUCK_RADIUS = 20;
const STRIKER_RADIUS = 35;
const GOAL_WIDTH = 140;
const GRAB_RADIUS = STRIKER_RADIUS * 1.8;
const GOAL_DROP_MS = 450;

// --- HELPER: local puck collision prediction (instant feedback) ---
function predictLocalPuckHit(myStriker, serverPuck) {
    if (!myStriker || !serverPuck) return null;

    const dx = serverPuck.x - myStriker.x;
    const dy = serverPuck.y - myStriker.y;
    const dist = Math.hypot(dx, dy);
    const minDist = PUCK_RADIUS + STRIKER_RADIUS;

    if (dist < minDist && dist > 0.01) {
        // Simple reflection vector – only show a visual kick, don't change the server
        const nx = dx / dist;
        const ny = dy / dist;
        const bounceMag = 8; // arbitrary visual push
        return {
            x: serverPuck.x + nx * (minDist - dist) + nx * bounceMag,
            y: serverPuck.y + ny * (minDist - dist) + ny * bounceMag
        };
    }
    return null;
}

// --- DRAWING FUNCTIONS (unchanged) ---
function getCanvasPoint(e, canvas) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * scaleX, y: (e.clientY - rect.top) * scaleY };
}

function toServerSpace(raw, role) {
    return role === 'p2'
        ? { x: GAME_WIDTH - raw.x, y: GAME_HEIGHT - raw.y }
        : { x: raw.x, y: raw.y };
}

function clampStriker(pos, role) {
    const x = Math.max(STRIKER_RADIUS, Math.min(GAME_WIDTH - STRIKER_RADIUS, pos.x));
    const y = role === 'p1'
        ? Math.max(GAME_HEIGHT / 2 + STRIKER_RADIUS, Math.min(GAME_HEIGHT - STRIKER_RADIUS, pos.y))
        : Math.max(STRIKER_RADIUS, Math.min(GAME_HEIGHT / 2 - STRIKER_RADIUS, pos.y));
    return { x, y };
}

// ... (drawBoardSurface, drawGoalHole, drawPuckTrail, drawStriker, drawPuck unchanged) ...

function renderGame({ puck, strikers, role, trail, drop, localPuck }, canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if (role === 'p2') {
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
    }

    drawBoardSurface(ctx, canvas);
    drawGoalHole(ctx, canvas, { y: 0, color: '#ef4444' });
    drawGoalHole(ctx, canvas, { y: canvas.height, color: '#3b82f6' });
    drawPuckTrail(ctx, trail);

    drawStriker(ctx, strikers.p1, '#3b82f6');
    drawStriker(ctx, strikers.p2, '#ef4444');

    // Goal drop animation
    if (drop) {
        drawPuck(ctx, drop, { scale: 1 - drop.progress, alpha: 1 - drop.progress });
    } else {
        // Show locally predicted puck if available, else the server puck
        const puckToDraw = localPuck || puck;
        if (puckToDraw) drawPuck(ctx, puckToDraw);
    }

    ctx.restore();
}

// --- CHAT PANEL (unchanged) ---
function ChatPanel({ messages, onSend, disabled }) { /* ... same ... */ }

export default function AirHockeyBoard() {
    const { roomCode } = useParams();
    const navigate = useNavigate();
    const location = useLocation();

    const [room, setRoom] = useState(location.state?.room ?? null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState('');

    const canvasRef = useRef(null);
    const gameStateRef = useRef(null);        // latest server state
    const myStrikerRef = useRef(null);        // client‑predicted striker
    const myRoleRef = useRef(null);
    const isDraggingRef = useRef(false);
    const dragPointerIdRef = useRef(null);
    const dragOriginRef = useRef({ x: 0, y: 0 });
    const strikerOriginRef = useRef({ x: 0, y: 0 });
    const puckTrailRef = useRef([]);
    const goalDropRef = useRef(null);
    const lastMoveEmit = useRef(0);
    const localPuckRef = useRef(null);        // locally predicted puck position

    const [uiState, setUiState] = useState({ score: { p1: 0, p2: 0 }, status: 'playing' });
    const [countdown, setCountdown] = useState(null);
    const [showGoal, setShowGoal] = useState(false);
    const [myRole, setMyRole] = useState(null);

    const myPlayerId = room?.viewerId;
    const isPlaying = room?.status === 'playing';
    const isHost = room?.hostId === myPlayerId;

    useEffect(() => { myRoleRef.current = myRole; }, [myRole]);

    // Join air hockey game on the server
    useEffect(() => {
        if (isPlaying && connected && room?.code && myPlayerId) {
            const socket = connectSocket();
            socket.emit('joinAirHockey', { roomId: room.code, playerInfo: { id: myPlayerId } });
        }
    }, [isPlaying, connected, room?.code, myPlayerId]);

    // Socket event setup
    useEffect(() => {
        const socket = connectSocket();
        const username = localStorage.getItem('pohahub_username');
        const deviceToken = localStorage.getItem('pohahub_device_token');

        if (!username) {
            navigate(`/games/air-hockey?join=${roomCode}`);
            return;
        }

        const syncRoom = async () => {
            if (!username || !roomCode) return;
            const result = await emitWithAck('room:join', {
                roomCode: roomCode.toUpperCase(),
                playerName: username,
                deviceToken: deviceToken,
            });
            if (result.ok) setRoom(result.room);
            else if (!location.state?.room) setError(result.error || 'Could not join room');
        };

        const onConnect = () => { setConnected(true); syncRoom(); };
        const onDisconnect = () => setConnected(false);
        const onRoomUpdate = (updatedRoom) => {
            if (updatedRoom.code === roomCode?.toUpperCase()) setRoom(updatedRoom);
        };
        const onChatMessage = (msg) => {
            setRoom((prev) => prev ? { ...prev, chat: [...(prev.chat ?? []), msg] } : prev);
        };
        const onRoomClosed = () => {
            setError('Room was closed');
            setTimeout(() => navigate('/games/air-hockey'), 2000);
        };
        const onGameOver = (state) => setUiState({ score: state.score, status: state.status, winner: state.winner });
        const onAirHockeyRole = ({ role }) => setMyRole(role);

        // NEW: receive high‑frequency state (60 Hz) – no interpolation needed
        const onHighFreqGameState = (state) => {
            gameStateRef.current = state;

            // Sync our striker unless we are dragging (client prediction wins)
            if (myRoleRef.current && !isDraggingRef.current) {
                myStrikerRef.current = { ...state.strikers[myRoleRef.current] };
            }

            // Clear local puck prediction on every server update (server is authoritative)
            localPuckRef.current = null;

            // Build puck trail for rendering (from server data)
            if (state.puck && (Math.hypot(state.puck.vx, state.puck.vy) > 3)) {
                puckTrailRef.current.push({ x: state.puck.x, y: state.puck.y });
                if (puckTrailRef.current.length > 10) puckTrailRef.current.shift();
            } else {
                puckTrailRef.current.length = 0;
            }

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
            const lastPuck = gameStateRef.current?.puck;
            if (lastPuck) {
                goalDropRef.current = { x: lastPuck.x, y: lastPuck.y, start: performance.now() };
            }
            setTimeout(() => setShowGoal(false), 1500);
        };

        socket.on('connect', onConnect);
        socket.on('disconnect', onDisconnect);
        socket.on('room:update', onRoomUpdate);
        socket.on('chat:message', onChatMessage);
        socket.on('room:closed', onRoomClosed);
        socket.on('airHockeyRole', onAirHockeyRole);
        socket.on('gameState', onHighFreqGameState);
        socket.on('countdown', onCountdown);
        socket.on('goalAnimation', onGoalAnimation);
        socket.on('gameOver', onGameOver);

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
            socket.off('airHockeyRole', onAirHockeyRole);
            socket.off('gameState', onHighFreqGameState);
            socket.off('countdown', onCountdown);
            socket.off('goalAnimation', onGoalAnimation);
            socket.off('gameOver', onGameOver);
        };
    }, [roomCode, navigate, location.state]);

    // Render loop – 60 fps, no interpolation, uses latest server state + local prediction
    useEffect(() => {
        let animationId;
        const renderLoop = () => {
            const canvas = canvasRef.current;
            const state = gameStateRef.current;
            if (!canvas || !state || !isPlaying) {
                animationId = requestAnimationFrame(renderLoop);
                return;
            }

            const role = myRoleRef.current;
            const strikers = { ...state.strikers };
            // Always show our locally predicted striker
            if (role && myStrikerRef.current) {
                strikers[role] = myStrikerRef.current;
            }

            // Local puck prediction when dragging near the puck
            let localPuck = null;
            if (role && isDraggingRef.current && myStrikerRef.current && state.puck) {
                localPuck = predictLocalPuckHit(myStrikerRef.current, state.puck);
                localPuckRef.current = localPuck;
            }

            // Goal drop animation override
            let dropToRender = null;
            if (goalDropRef.current) {
                const elapsed = performance.now() - goalDropRef.current.start;
                if (elapsed < GOAL_DROP_MS) {
                    dropToRender = { ...goalDropRef.current, progress: elapsed / GOAL_DROP_MS };
                } else {
                    goalDropRef.current = null;
                }
            }

            renderGame({
                puck: dropToRender ? null : state.puck,
                strikers,
                role,
                trail: puckTrailRef.current,
                drop: dropToRender,
                localPuck: localPuckRef.current,
            }, canvas);

            animationId = requestAnimationFrame(renderLoop);
        };
        renderLoop();
        return () => cancelAnimationFrame(animationId);
    }, [isPlaying]);

    // Input handlers – same grab‑to‑drag with 60 Hz throttling
    const handlePointerDown = (e) => {
        const canvas = canvasRef.current;
        const role = myRoleRef.current;
        const state = gameStateRef.current;
        if (!canvas || !role || !state || state.status !== 'playing') return;

        const raw = getCanvasPoint(e, canvas);
        const target = toServerSpace(raw, role);
        const current = myStrikerRef.current || state.strikers[role];
        if (Math.hypot(target.x - current.x, target.y - current.y) > GRAB_RADIUS) return;

        isDraggingRef.current = true;
        dragPointerIdRef.current = e.pointerId;
        dragOriginRef.current = raw;
        strikerOriginRef.current = { ...current };
        canvas.setPointerCapture?.(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!isDraggingRef.current || e.pointerId !== dragPointerIdRef.current) return;
        const state = gameStateRef.current;
        if (!state || state.status !== 'playing') {
            isDraggingRef.current = false;
            dragPointerIdRef.current = null;
            return;
        }
        const canvas = canvasRef.current;
        const role = myRoleRef.current;
        if (!canvas || !role) return;

        const raw = getCanvasPoint(e, canvas);
        let dx = raw.x - dragOriginRef.current.x;
        let dy = raw.y - dragOriginRef.current.y;
        if (role === 'p2') { dx = -dx; dy = -dy; }

        const next = clampStriker(
            { x: strikerOriginRef.current.x + dx, y: strikerOriginRef.current.y + dy },
            role
        );
        myStrikerRef.current = next;

        // Send at up to 60 Hz (≈16 ms)
        const now = Date.now();
        if (now - lastMoveEmit.current < 16) return;
        lastMoveEmit.current = now;
        connectSocket().emit('airHockeyMove', { roomId: roomCode, position: next });
    };

    const endDrag = (e) => {
        if (e.pointerId !== dragPointerIdRef.current) return;
        isDraggingRef.current = false;
        dragPointerIdRef.current = null;
        if (myStrikerRef.current) {
            connectSocket().emit('airHockeyMove', { roomId: roomCode, position: myStrikerRef.current });
        }
        const canvas = canvasRef.current;
        if (canvas?.hasPointerCapture?.(e.pointerId)) {
            canvas.releasePointerCapture(e.pointerId);
        }
    };

    // ... (handleStart, handlePlayAgain, handleChat identical) ...

    // JSX rendering identical to original, omitted for brevity.


  const handleStart = async () => {
    setError('');
    const result = await emitWithAck('room:start', {});
    if (!result.ok) setError(result.error);
  };

  const handlePlayAgain = async () => {
    setError('');
    const result = await emitWithAck('game:reset', {});
    if (result.ok) {
      const socket = connectSocket();
      socket.emit('airHockeyRematch', roomCode);
    } else {
      setError(result.error || 'Failed to start a new game');
    }
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

      <div className="flex flex-col lg:flex-row gap-[clamp(1rem,3vw,2rem)] items-stretch">
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

            {isPlaying && (
              <div className="mx-auto w-full max-w-[420px] mt-4 flex flex-col items-center">
                <div className="flex w-full justify-between px-4 py-3 bg-white border-[3px] border-black shadow-[4px_4px_0px_#000] rounded mb-4 font-black text-xl uppercase rotate-1">
                  <div className="text-[#3b82f6]">P1 Score: {uiState.score.p1}</div>
                  <div className="text-[#ef4444]">P2 Score: {uiState.score.p2}</div>
                </div>
                {myRole && (
                  <p className="text-center text-[10px] sm:text-xs font-black tracking-widest uppercase text-gray-300 mb-3 -mt-1">
                    You're <span className={myRole === 'p1' ? 'text-[#3b82f6]' : 'text-[#ef4444]'}>{myRole === 'p1' ? 'Blue · P1' : 'Red · P2'}</span> — always at the bottom of your screen
                  </p>
                )}
                <div className="relative border-[4px] border-black bg-white p-2 shadow-[8px_8px_0px_#000] rounded-xl -rotate-1">
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
                    width={GAME_WIDTH}
                    height={GAME_HEIGHT}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={endDrag}
                    onPointerCancel={endDrag}
                    className="cursor-grab active:cursor-grabbing touch-none block max-w-full h-auto rounded"
                  />
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