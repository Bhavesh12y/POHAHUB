import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby';
import VoiceChat from '../../components/VoiceChat';

// These MUST exactly mirror the authoritative constants in the backend
// (airHockey.js) — the server is the single source of truth for physics;
// the client only uses these for input math and drawing.
const GAME_WIDTH = 400;
const GAME_HEIGHT = 600;
const PUCK_RADIUS = 15;
const STRIKER_RADIUS = 25;
const GOAL_WIDTH = 120;
const GRAB_RADIUS = STRIKER_RADIUS * 1.8; // generous "am I on my striker?" tolerance, tuned for touch
const GOAL_DROP_MS = 450; // duration of the puck's "falling into the hole" animation

const lerp = (a, b, t) => a + (b - a) * t;

// ---------------------------------------------------------------------
// Input helpers (pure functions, no component state — kept outside the
// component so they aren't recreated on every render)
// ---------------------------------------------------------------------

function getCanvasPoint(e, canvas) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

// Requirement 2: P2's canvas is rendered rotated 180°, so a raw click on
// their screen must be mirrored on both axes to land on the correct
// physics coordinate in the server's fixed coordinate space.
function toServerSpace(raw, role) {
  return role === 'p2'
    ? { x: GAME_WIDTH - raw.x, y: GAME_HEIGHT - raw.y }
    : { x: raw.x, y: raw.y };
}

// Mirrors the server's own clamping in handlePlayerMove, so what we
// predict locally never visibly disagrees with what the server allows.
function clampStriker(pos, role) {
  const x = Math.max(STRIKER_RADIUS, Math.min(GAME_WIDTH - STRIKER_RADIUS, pos.x));
  const y = role === 'p1'
    ? Math.max(GAME_HEIGHT / 2 + STRIKER_RADIUS, Math.min(GAME_HEIGHT - STRIKER_RADIUS, pos.y))
    : Math.max(STRIKER_RADIUS, Math.min(GAME_HEIGHT / 2 - STRIKER_RADIUS, pos.y));
  return { x, y };
}

// ---------------------------------------------------------------------
// Drawing helpers (pure functions of ctx + data, no React/component
// state). Kept outside the component so they're defined once, not on
// every render.
// ---------------------------------------------------------------------

function drawBoardSurface(ctx, canvas) {
  const w = canvas.width;
  const h = canvas.height;

  // Table "felt": a dark vertical gradient instead of a flat fill, so
  // the board has depth before anything else is drawn on top of it.
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#0b1220');
  bg.addColorStop(0.5, '#111827');
  bg.addColorStop(1, '#0b1220');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  // Subtle vignette to draw the eye toward center ice.
  const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.15, w / 2, h / 2, h * 0.7);
  vignette.addColorStop(0, 'rgba(0,0,0,0)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, w, h);

  ctx.save();
  // Requirement 5: premium glowing dashed center line + face-off circle,
  // arcade-cabinet styling instead of a flat painted stripe.
  ctx.shadowBlur = 8;
  ctx.shadowColor = '#22d3ee';
  ctx.strokeStyle = 'rgba(34,211,238,0.75)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 8]);
  ctx.beginPath();
  ctx.moveTo(12, h / 2);
  ctx.lineTo(w - 12, h / 2);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 55, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(w / 2, h / 2, 4, 0, Math.PI * 2);
  ctx.fillStyle = '#22d3ee';
  ctx.shadowBlur = 12;
  ctx.fill();
  ctx.restore();

  // Outer rail.
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, w - 8, h - 8);
}

// Requirement 3: goals rendered as physical "holes" carved into the
// board (radial cavity gradient + glow + raised rim) instead of flat
// painted rectangles.
function drawGoalHole(ctx, canvas, { y, color }) {
  const cx = canvas.width / 2;
  const halfW = GOAL_WIDTH / 2;
  const depth = 22;

  ctx.save();

  // The cavity itself: a dark radial gradient standing in for an
  // inner-shadowed hole (canvas has no native inset-shadow primitive).
  const cavity = ctx.createRadialGradient(cx, y, 3, cx, y, halfW);
  cavity.addColorStop(0, '#020617');
  cavity.addColorStop(0.55, '#0f172a');
  cavity.addColorStop(1, 'rgba(15, 23, 42, 0)');
  ctx.beginPath();
  ctx.ellipse(cx, y, halfW, depth, 0, 0, Math.PI * 2);
  ctx.fillStyle = cavity;
  ctx.fill();

  // Ambient glow spilling from inside the hole in the team's color, as
  // if lit from underneath — sells the "puck drops in" feeling.
  ctx.shadowBlur = 20;
  ctx.shadowColor = color;
  ctx.strokeStyle = `${color}66`;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(cx, y, halfW - 3, depth - 5, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // Raised rim highlight so the hole reads as carved into the table
  // rather than drawn on top of it.
  ctx.strokeStyle = 'rgba(226,232,240,0.5)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(cx, y, halfW, depth, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

// Requirement 5: fading motion trail behind a fast-moving puck.
function drawPuckTrail(ctx, trail) {
  if (!trail || trail.length < 2) return;
  ctx.save();
  for (let i = 0; i < trail.length; i++) {
    const p = trail[i];
    const t = (i + 1) / trail.length; // older points are smaller/fainter
    ctx.beginPath();
    ctx.fillStyle = `rgba(148, 197, 255, ${t * 0.25})`;
    ctx.arc(p.x, p.y, PUCK_RADIUS * (0.35 + 0.5 * t), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Requirement 5: neon glow via shadowBlur/shadowColor on the strikers.
function drawStriker(ctx, pos, color) {
  if (!pos) return;
  ctx.save();
  ctx.shadowBlur = 22;
  ctx.shadowColor = color;

  const grad = ctx.createRadialGradient(pos.x - 8, pos.y - 8, 4, pos.x, pos.y, STRIKER_RADIUS);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.35, color);
  grad.addColorStop(1, color);

  ctx.beginPath();
  ctx.arc(pos.x, pos.y, STRIKER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#0f172a';
  ctx.stroke();
  ctx.restore();
}

// Requirement 5: neon glow on the puck. Accepts scale/alpha so the same
// function can render the shrinking "fell into the hole" goal animation.
function drawPuck(ctx, pos, { scale = 1, alpha = 1 } = {}) {
  if (!pos || scale <= 0) return;
  const r = PUCK_RADIUS * scale;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowBlur = 26 * scale;
  ctx.shadowColor = '#38bdf8';

  const grad = ctx.createRadialGradient(pos.x - 5, pos.y - 5, 1, pos.x, pos.y, Math.max(r, 0.01));
  grad.addColorStop(0, '#334155');
  grad.addColorStop(1, '#020617');

  ctx.beginPath();
  ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.shadowBlur = 14 * scale;
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#38bdf8';
  ctx.stroke();
  ctx.restore();
}

// Assembles one full frame. `role` is the local player's own role
// ('p1' | 'p2' | null before it's known yet).
function renderGame({ puck, strikers, role, trail, drop }, canvas) {
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  // --- Requirement 2: Relative Perspective Rendering ------------------
  // Server physics never changes (P1 always bottom, P2 always top). We
  // only rotate the DRAWING 180° about the board's center, and only for
  // the player who is P2, so every player visually plays "up the board"
  // from the bottom of their own screen.
  if (role === 'p2') {
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(Math.PI);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);
  }

  drawBoardSurface(ctx, canvas);
  drawGoalHole(ctx, canvas, { y: 0, color: '#ef4444' });            // top goal — P1 scores here
  drawGoalHole(ctx, canvas, { y: canvas.height, color: '#3b82f6' }); // bottom goal — P2 scores here
  drawPuckTrail(ctx, trail);

  drawStriker(ctx, strikers.p1, '#3b82f6');
  drawStriker(ctx, strikers.p2, '#ef4444');

  if (drop) {
    // Requirement 3: shrink + fade the puck at its last position instead
    // of letting it teleport straight back to center on a goal.
    drawPuck(ctx, drop, { scale: 1 - drop.progress, alpha: 1 - drop.progress });
  } else if (puck) {
    drawPuck(ctx, puck);
  }

  ctx.restore();
}

// Reusable Chat Panel
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
  
  const [room, setRoom] = useState(location.state?.room ?? null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  const canvasRef = useRef(null);
  const gameStateRef = useRef(null);        // latest authoritative server state
  const prevGameStateRef = useRef(null);    // previous server state, lerp source
  const currStateTimeRef = useRef(0);       // performance.now() when gameStateRef was set
  const prevStateTimeRef = useRef(0);       // performance.now() when prevGameStateRef was set
  const myStrikerRef = useRef(null);        // client-predicted position of MY OWN striker
  const myRoleRef = useRef(null);           // 'p1' | 'p2' — mirrors myRole state, for use in handlers
  const isDraggingRef = useRef(false);
  const dragPointerIdRef = useRef(null);
  const dragOriginRef = useRef({ x: 0, y: 0 });     // raw pointer position at grab time
  const strikerOriginRef = useRef({ x: 0, y: 0 });  // striker position at grab time
  const puckTrailRef = useRef([]);
  const goalDropRef = useRef(null);
  const lastMoveEmit = useRef(0); // For network throttling

  const [uiState, setUiState] = useState({ score: { p1: 0, p2: 0 }, status: 'playing' });
  const [countdown, setCountdown] = useState(null);
  const [showGoal, setShowGoal] = useState(false);
  const [myRole, setMyRole] = useState(null); // 'p1' | 'p2', assigned by the server on join

  const myPlayerId = room?.viewerId;
  const isPlaying = room?.status === 'playing';
  const isHost = room?.hostId === myPlayerId;

  // Keep the ref in sync so render/pointer callbacks always see the
  // latest role without needing to be recreated every render.
  useEffect(() => {
    myRoleRef.current = myRole;
  }, [myRole]);

  // FIX: Extracted inner useEffect to top level
  useEffect(() => {
    if (isPlaying && connected && room?.code && myPlayerId) {
      const socket = connectSocket();
      socket.emit('joinAirHockey', { 
        roomId: room.code, 
        playerInfo: { id: myPlayerId } 
      });
    }
  }, [isPlaying, connected, room?.code, myPlayerId]);

  useEffect(() => {
    const socket = connectSocket();
    const username = localStorage.getItem('pohahub_username');
    // Ensure you generate/store a unique device token in localStorage on first visit for security
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
        deviceToken: deviceToken, // Pass token for session verification
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

    // NEW: the server assigns our side (p1/p2) right after we join. This
    // drives the 180° flip and input inversion for P2 (Requirement 2).
    const onAirHockeyRole = ({ role }) => setMyRole(role);

    const onHighFreqGameState = (state) => {
      const now = performance.now();
      const previous = gameStateRef.current;

      // A status change (e.g. playing -> countdown right after a goal)
      // means positions just hard-reset server-side. Snap instead of
      // lerping across that jump, so the puck doesn't visibly "slide"
      // back to center. Timestamps below are captured with
      // performance.now() on THIS client at receive time — never the
      // server's own clock — so there's no clock-sync assumption baked
      // into the interpolation math in the render loop.
      const hardReset = !previous || previous.status !== state.status;

      prevGameStateRef.current = hardReset ? state : previous;
      prevStateTimeRef.current = hardReset ? now : currStateTimeRef.current;
      currStateTimeRef.current = now;
      gameStateRef.current = state;

      if (hardReset) {
        puckTrailRef.current = [];
      }

      // Keep our own striker synced to the server EXCEPT mid-drag, where
      // local prediction should win so the player's own input is never
      // fought by a slightly-lagging echo of itself (Requirement 4).
      const role = myRoleRef.current;
      if (role && !isDraggingRef.current) {
        myStrikerRef.current = { ...state.strikers[role] };
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
      // Freeze the puck at its last known spot and let the render loop
      // play a brief shrink-and-fade "falling into the hole" animation
      // there (Requirement 3), instead of it just popping to center.
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
    };
  }, [roomCode, navigate, location.state]);

  // Requirement 4: 60fps render loop that interpolates the puck and the
  // opponent's striker between 30Hz server snapshots, while the local
  // player's own striker renders instantly from client-side prediction.
  useEffect(() => {
    let animationId;

    const renderLoop = () => {
      const canvas = canvasRef.current;
      const state = gameStateRef.current;

      if (canvas && state && isPlaying) {
        const role = myRoleRef.current;
        let puckToRender = state.puck;
        let strikersToRender = state.strikers;
        let trailToRender = [];

        if (role) {
          const prevState = prevGameStateRef.current || state;
          const span = Math.max(currStateTimeRef.current - prevStateTimeRef.current, 1);
          const t = Math.min(Math.max((performance.now() - currStateTimeRef.current) / span, 0), 1);

          const opponentRole = role === 'p1' ? 'p2' : 'p1';
          puckToRender = {
            x: lerp(prevState.puck.x, state.puck.x, t),
            y: lerp(prevState.puck.y, state.puck.y, t),
          };
          strikersToRender = {
            [opponentRole]: {
              x: lerp(prevState.strikers[opponentRole].x, state.strikers[opponentRole].x, t),
              y: lerp(prevState.strikers[opponentRole].y, state.strikers[opponentRole].y, t),
            },
            // Client-side prediction: MY striker renders from local input
            // immediately, without waiting on a server round-trip.
            [role]: myStrikerRef.current || state.strikers[role],
          };

          // Puck motion trail, only while it's actually moving fast.
          const speed = Math.hypot(state.puck.vx, state.puck.vy);
          if (speed > 3) {
            puckTrailRef.current.push({ x: puckToRender.x, y: puckToRender.y });
            if (puckTrailRef.current.length > 10) puckTrailRef.current.shift();
          } else {
            puckTrailRef.current.length = 0;
          }
          trailToRender = puckTrailRef.current;
        }

        // Goal "drop" animation overrides the live puck for a brief
        // moment right after a goal (Requirement 3).
        let dropToRender = null;
        const drop = goalDropRef.current;
        if (drop) {
          const elapsed = performance.now() - drop.start;
          if (elapsed < GOAL_DROP_MS) {
            dropToRender = { x: drop.x, y: drop.y, progress: elapsed / GOAL_DROP_MS };
          } else {
            goalDropRef.current = null;
          }
        }

        renderGame(
          {
            puck: dropToRender ? null : puckToRender,
            strikers: strikersToRender,
            role,
            trail: trailToRender,
            drop: dropToRender,
          },
          canvas
        );
      }

      animationId = requestAnimationFrame(renderLoop);
    };

    renderLoop();
    return () => cancelAnimationFrame(animationId);
  }, [isPlaying]);

  // Requirement 1: grab-to-drag. Only starts a drag if the pointer landed
  // on (or very near) the player's own striker.
  const handlePointerDown = (e) => {
    const canvas = canvasRef.current;
    const role = myRoleRef.current;
    const state = gameStateRef.current;
    if (!canvas || !role || !state || state.status !== 'playing') return;

    const raw = getCanvasPoint(e, canvas);
    const target = toServerSpace(raw, role);
    const current = myStrikerRef.current || state.strikers[role];

    const distance = Math.hypot(target.x - current.x, target.y - current.y);
    if (distance > GRAB_RADIUS) return; // missed the striker — ignore, no snapping

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
      // Game state changed mid-drag (e.g. a goal was just scored) — bail
      // out cleanly instead of leaving a stale drag in progress.
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
    if (role === 'p2') {
      // Requirement 2: in the 180°-rotated view, a drag that looks
      // rightward/downward on screen is actually leftward/upward in the
      // server's fixed coordinate space.
      dx = -dx;
      dy = -dy;
    }

    // Requirement 1: delta-based movement — the striker moves by how far
    // the pointer has traveled since the grab, starting from wherever it
    // was grabbed. It never snaps to the pointer's absolute position.
    const next = clampStriker(
      { x: strikerOriginRef.current.x + dx, y: strikerOriginRef.current.y + dy },
      role
    );

    // Requirement 4: client-side prediction — render instantly, locally.
    myStrikerRef.current = next;

    // 30Hz network throttle, unchanged from before.
    const now = Date.now();
    if (now - lastMoveEmit.current < 33) return;
    lastMoveEmit.current = now;

    const socket = connectSocket();
    socket.emit('airHockeyMove', { roomId: roomCode, position: next });
  };

  const endDrag = (e) => {
    if (e.pointerId !== dragPointerIdRef.current) return;
    isDraggingRef.current = false;
    dragPointerIdRef.current = null;

    // Force one final, un-throttled sync so the server's copy of our
    // striker exactly matches where we visually left it.
    if (myStrikerRef.current) {
      const socket = connectSocket();
      socket.emit('airHockeyMove', { roomId: roomCode, position: myStrikerRef.current });
    }

    const canvas = canvasRef.current;
    if (canvas?.hasPointerCapture?.(e.pointerId)) {
      canvas.releasePointerCapture(e.pointerId);
    }
  };

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