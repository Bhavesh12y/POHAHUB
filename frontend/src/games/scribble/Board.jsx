import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby';
import VoiceChat from '../../components/VoiceChat';

function ChatPanel({ messages, onSend, disabled }) {
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
      <div className="px-4 py-3 sm:py-4 border-b-[3px] border-black font-bold tracking-widest text-xs uppercase text-gray-200 bg-[#222]">
        Guesses & Chat
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 text-sm scrollbar-thin scrollbar-thumb-gray-600 bg-[#333]">
        {messages.length === 0 && (
          <p className="text-gray-400 text-center py-4 font-bold italic">No messages yet</p>
        )}
        {messages.map((msg) => {
          const isSystem = msg.playerId === 'SYSTEM';
          const isSuccess = msg.message.includes('Guessed the word!');
          
          return (
            <div key={msg.id} className={`break-words ${
              isSystem ? 'text-center my-3 bg-[#f9a8d4] text-black border-[2px] border-black rounded p-2 shadow-[2px_2px_0px_#000]' : 
              isSuccess ? 'text-[#4ade80] font-black uppercase' : ''
            }`}>
              {!isSystem && (
                <span className="font-black text-[#facc15] tracking-wider uppercase">{msg.playerName}: </span>
              )}
              <span className={isSystem ? 'font-black text-[11px] uppercase tracking-widest' : 'text-white font-medium'}>
                {msg.message}
              </span>
            </div>
          );
        })}
      </div>
      
      <form onSubmit={handleSubmit} className="p-2 sm:p-3 border-t-[3px] border-black flex gap-2 bg-[#2a2a2a] rounded-b-lg shrink-0">
        <input
          type="text"
          className="py-2 px-3 text-sm flex-1 bg-black border-[2px] border-black rounded text-white focus:outline-none focus:ring-2 focus:ring-[#facc15]"
          placeholder={disabled ? "You can't chat right now..." : "Type your guess..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          maxLength={100}
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

export default function ScribbleBoard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [room, setRoom] = useState(location.state?.room ?? null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  const canvasRef = useRef(null);
  const isDrawing = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const socket = connectSocket();
  const username = localStorage.getItem('pohahub_username');
  
  // FIX 1: Retrieve device token so guest sockets bind to the room successfully
  const deviceToken = localStorage.getItem('pohahub_device_token'); 

  const myPlayerId = socket.id;
  const isHost = room?.hostId === myPlayerId;
  const isDrawer = room?.gameState?.drawerId === myPlayerId;
  const me = room?.gameState?.players?.find(p => p.id === myPlayerId);

  useEffect(() => {
    if (!username) {
      navigate(`/games/scribble?join=${roomCode}`);
      return;
    }

    const syncRoom = async () => {
      const result = await emitWithAck('room:join', {
        roomCode: roomCode.toUpperCase(),
        playerName: username,
        deviceToken // FIX 1 (Continued): Send token in the payload
      });
      if (result.ok) setRoom(result.room);
      else if (!location.state?.room) setError(result.error || 'Could not join room');
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
  }, [roomCode, navigate, username, socket, deviceToken]);

  // --- Socket Listeners for Drawing ---
  useEffect(() => {
    if (room?.status !== 'playing') return;

    const handleDrawLine = (data) => {
      if (isDrawer) return; 
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.lineWidth = data.thickness || 3;
      ctx.lineCap = 'round';
      ctx.strokeStyle = data.color || '#000000';
      ctx.beginPath();
      ctx.moveTo(data.x0, data.y0);
      ctx.lineTo(data.x1, data.y1);
      ctx.stroke();
    };

    const handleDrawFill = (data) => {
      if (isDrawer) return;
      const ctx = canvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.fillStyle = data.color;
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    };

    const handleDrawClear = () => {
      if (isDrawer) return;
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    };

    socket.on('draw:line', handleDrawLine);
    socket.on('draw:fill', handleDrawFill);
    socket.on('draw:clear', handleDrawClear);

    return () => {
      socket.off('draw:line', handleDrawLine);
      socket.off('draw:fill', handleDrawFill);
      socket.off('draw:clear', handleDrawClear);
    };
  }, [room?.status, isDrawer, socket]);

  // --- Initial Render of Stroke History ---
  useEffect(() => {
    if (room?.status === 'playing' && canvasRef.current && room.gameState?.history) {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      room.gameState.history.forEach(stroke => {
        if (stroke.type === 'fill') {
          ctx.fillStyle = stroke.color;
          ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        } else if (stroke.type === 'line') {
          ctx.lineWidth = stroke.thickness || 3;
          ctx.lineCap = 'round';
          ctx.strokeStyle = stroke.color || '#000000';
          ctx.beginPath();
          ctx.moveTo(stroke.x0, stroke.y0);
          ctx.lineTo(stroke.x1, stroke.y1);
          ctx.stroke();
        }
      });
    }
  }, [room?.status, room?.gameState?.turnState]);

  const handleStart = async () => {
    setError('');
    const result = await emitWithAck('room:start', {});
    if (!result.ok) setError(result.error);
  };

  const handleChat = async (message) => {
    await emitWithAck('chat:message', { message });
  };

  const handleSelectWord = async (word) => {
    await emitWithAck('game:selectWord', { word });
  };

  // --- Drawing Logic ---
  const [color, setColor] = useState('#000000');
  const [thickness, setThickness] = useState(3);
  const [tool, setTool] = useState('pen');

  const getPointerPos = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    const clientY = e.clientY ?? e.touches?.[0]?.clientY;
    
    // Calculate scaling factors
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
  
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (e) => {
    if (!isDrawer || room.gameState?.turnState !== 'drawing') return;
    
    if (tool === 'fill') {
      const ctx = canvasRef.current.getContext('2d');
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      socket.emit('draw:fill', { color });
      return;
    }

    isDrawing.current = true;
    lastPos.current = getPointerPos(e);
  };

  const draw = (e) => {
    if (!isDrawing.current || !isDrawer || room.gameState?.turnState !== 'drawing') return;
    const currentPos = getPointerPos(e);
    if (!currentPos) return;

    const ctx = canvasRef.current.getContext('2d');
    const drawColor = tool === 'eraser' ? '#ffffff' : color;
    const drawThickness = tool === 'eraser' ? 20 : thickness;

    ctx.lineWidth = drawThickness;
    ctx.lineCap = 'round';
    ctx.strokeStyle = drawColor;
    
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(currentPos.x, currentPos.y);
    ctx.stroke();

    socket.emit('draw:line', {
      x0: lastPos.current.x, y0: lastPos.current.y,
      x1: currentPos.x, y1: currentPos.y,
      color: drawColor, thickness: drawThickness
    });

    lastPos.current = currentPos;
  };

  const stopDrawing = () => {
    isDrawing.current = false;
  };

  const clearCanvas = () => {
    if (!isDrawer) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    socket.emit('draw:clear');
  };

  if (!room) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] p-10 rounded-lg max-w-md mx-auto -rotate-1">
          <div className="animate-pulse text-gray-500 font-bold mb-2 tracking-widest uppercase text-sm">Connecting to Room...</div>
          <p className="text-3xl text-black font-black font-mono">{roomCode}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[1600px] mx-auto px-[clamp(0.5rem,2vw,1.5rem)] py-[clamp(1rem,3vw,2rem)] relative font-sans">
      
      {/* HEADER INFO */}
      <div className="bg-[#333333] border-[3px] border-black rounded-lg p-4 sm:p-6 shadow-[6px_6px_0px_#000] -rotate-1 text-white mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-1">Room Code</p>
            <p className="text-xl sm:text-2xl font-black tracking-widest text-white uppercase">{room.code}</p>
          </div>
          <VoiceChat roomCode={room.code} />
          <div className="text-right">
            <p className="text-xs font-bold tracking-widest uppercase text-gray-400 mb-1">Status</p>
            <p className="font-black text-[#facc15] text-sm sm:text-base uppercase">
              {room.status === 'waiting' ? 'Waiting Lobby' : 'Match in Progress'}
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-[#ef4444] border-[3px] border-black rounded text-black font-black uppercase shadow-[4px_4px_0px_#000] -rotate-1">
          {error}
        </div>
      )}

      {/* GAME OVER MODAL */}
      {room.status === 'playing' && room.gameState?.turnState === 'finished' && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white border-[4px] border-black shadow-[12px_12px_0px_#000] p-8 max-w-md w-full text-center rounded-xl -rotate-2">
            <h2 className="text-4xl font-black mb-6 uppercase text-[#3b82f6]">Game Over!</h2>
            <div className="space-y-3 mb-8">
              {[...room.gameState.players].sort((a,b) => b.score - a.score).map((p, i) => (
                <div key={p.id} className="flex justify-between items-center text-lg font-bold border-b-2 border-dashed border-gray-300 pb-2">
                  <span>{i===0?'🏆 ':''}{p.name}</span>
                  <span className="text-[#facc15] bg-black px-2 rounded border-2 border-black">{p.score} pts</span>
                </div>
              ))}
            </div>
            {isHost && (
              <button 
                onClick={handleStart}
                className="w-full bg-[#facc15] text-black px-6 py-4 font-black text-xl uppercase border-[3px] border-black rounded shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all"
              >
                Play Again
              </button>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-[clamp(1rem,3vw,2rem)] items-stretch">
        
        {/* LEFT COLUMN: GAME BOARD / LOBBY */}
        <div className="flex-1 w-full min-w-0 flex flex-col">
          {room.status === 'waiting' && (
            <WaitingLobby
              roomCode={room.code}
              isHost={isHost}
              playerCount={room.players.length}
              maxPlayers={8}
              onStart={handleStart}
              gamePath="scribble/room"
            />
          )}

          {room.status === 'playing' && (
            <div className="flex flex-col items-center w-full max-w-3xl mx-auto">
              
              <div className="w-full flex justify-between items-center bg-white border-[3px] border-black p-3 mb-4 rounded-lg shadow-[4px_4px_0px_#000]">
                 <div className="font-black text-xl text-black">
                   {room.gameState?.turnState === 'drawing' ? (
                     isDrawer ? (
                       <span>DRAW: <span className="text-blue-600 tracking-widest">{room.gameState.currentWord}</span></span>
                     ) : (
                       <span>GUESS THE WORD!</span>
                     )
                   ) : (
                     <span>Waiting for turn...</span>
                   )}
                 </div>
                 <div className="font-bold uppercase tracking-widest text-gray-500">
                   Round {room.gameState?.currentRound || 1} / {room.gameState?.maxRounds || 3}
                 </div>
              </div>

              {/* Player List */}
              {room.gameState?.players && (
                <div className="w-full flex flex-wrap justify-center gap-2 sm:gap-4 mb-4">
                  {room.gameState.players.map((player, index) => {
                    const isDrawer = player.id === room.gameState.drawerId;
                    const hasGuessed = room.gameState.guessedPlayers.includes(player.id);
                    return (
                      <div 
                        key={player.id} 
                        className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2 rounded-lg border-[3px] border-black transition-all ${
                            isDrawer ? 'bg-[#3b82f6] text-white shadow-[4px_4px_0px_#000]' : 
                            hasGuessed ? 'bg-[#10b981] text-black shadow-[4px_4px_0px_#000]' : 
                            'bg-white text-black shadow-[3px_3px_0px_#000]'
                        }`}
                      >
                        <div className="font-black text-lg w-3 sm:w-4">{index + 1}</div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-[11px] sm:text-sm font-bold truncate">
                            {player.name} {isDrawer && '✏️'} {hasGuessed && '✔️'}
                          </span>
                          <span className={`text-[10px] sm:text-xs font-bold ${isDrawer ? 'text-blue-200' : 'text-gray-600'}`}>
                            {player.score ?? 0} pts
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* CANVAS WRAPPER */}
              <div className="relative w-full border-[4px] border-black rounded-lg shadow-[8px_8px_0px_#000] overflow-hidden bg-white mb-4">
                
                {/* TIMER OVERLAY */}
                {room.gameState?.turnState === 'drawing' && (
                  <div className="absolute top-4 right-4 bg-black text-[#facc15] px-4 py-2 font-black text-2xl border-[3px] border-black rounded z-10 animate-pulse shadow-[4px_4px_0px_#facc15]">
                    {Math.max(0, Math.ceil(room.gameState.timeLimit - ((Date.now() - room.gameState.startTime) / 1000)))}s
                  </div>
                )}

                {/* HINT OVERLAY */}
                {!isDrawer && room.gameState?.turnState === 'drawing' && room.gameState?.hint && (
                  <div className="absolute top-4 left-4 bg-white/90 text-black px-4 py-2 font-black text-xl border-[3px] border-black tracking-[0.2em] rounded z-10 shadow-[4px_4px_0px_#000]">
                    {room.gameState.hint}
                  </div>
                )}

                {/* WORD SELECTION OVERLAY */}
                {room.gameState?.turnState === 'selecting' && (
                  <div className="absolute inset-0 bg-black/80 z-20 flex flex-col items-center justify-center p-4 text-center">
                    {isDrawer ? (
                      <div>
                        <h2 className="text-3xl font-black text-white mb-6 uppercase">Choose a word</h2>
                        <div className="flex flex-wrap justify-center gap-4">
                          {room.gameState.wordOptions.map(w => (
                            <button
                              key={w}
                              onClick={() => handleSelectWord(w)}
                              className="bg-[#facc15] text-black px-6 py-3 font-black text-xl uppercase border-[3px] border-black rounded shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all"
                            >
                              {w}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="text-[#facc15] text-2xl font-black uppercase animate-pulse">
                        {room.players.find(p => p.id === room.gameState.drawerId)?.name || 'Player'} is choosing a word...
                      </div>
                    )}
                  </div>
                )}

                <canvas
                  ref={canvasRef}
                  width={800}
                  height={600}
                  className={`w-full aspect-[4/3] bg-white rounded cursor-crosshair touch-none ${!isDrawer ? 'pointer-events-none' : ''}`}
                  onPointerDown={startDrawing}
                  onPointerMove={draw}
                  onPointerUp={stopDrawing}
                  onPointerLeave={stopDrawing}
                  onPointerCancel={stopDrawing}
                />
              </div>

              {/* DRAWING CONTROLS */}
              {isDrawer && room.gameState?.turnState === 'drawing' && (
                <div className="w-full bg-[#222] p-3 rounded-lg border-[3px] border-black flex flex-wrap gap-4 items-center justify-between shadow-[4px_4px_0px_#000]">
                  <div className="flex gap-2">
                    {['#000000', '#ef4444', '#3b82f6', '#10b981', '#facc15', '#a855f7'].map(c => (
                      <button
                        key={c}
                        onClick={() => { setColor(c); setTool('pen'); }}
                        className={`w-8 h-8 rounded-full border-[3px] border-black shadow-[2px_2px_0px_#000] hover:scale-110 transition-transform ${color === c && tool === 'pen' ? 'scale-110 ring-4 ring-white' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setTool('pen')} className={`px-4 py-2 font-black uppercase text-xs border-[2px] border-black rounded shadow-[2px_2px_0px_#000] ${tool === 'pen' ? 'bg-[#facc15] text-black' : 'bg-gray-700 text-white'}`}>Pen</button>
                    <button onClick={() => setTool('fill')} className={`px-4 py-2 font-black uppercase text-xs border-[2px] border-black rounded shadow-[2px_2px_0px_#000] ${tool === 'fill' ? 'bg-[#facc15] text-black' : 'bg-gray-700 text-white'}`}>Fill</button>
                    <button onClick={() => setTool('eraser')} className={`px-4 py-2 font-black uppercase text-xs border-[2px] border-black rounded shadow-[2px_2px_0px_#000] ${tool === 'eraser' ? 'bg-white text-black' : 'bg-gray-700 text-white'}`}>Eraser</button>
                    <button onClick={clearCanvas} className="px-4 py-2 font-black uppercase text-xs bg-red-500 text-white border-[2px] border-black rounded shadow-[2px_2px_0px_#000]">Clear</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Chat / Guess Panel (FIX 2: ALWAYS VISIBLE SO PLAYERS SEE CHAT IN LOBBY) */}
        <div className="w-full lg:w-80 h-[400px] lg:h-auto shrink-0 flex flex-col mt-4 lg:mt-0">
          <ChatPanel
            messages={room.chat ?? []}
            onSend={handleChat}
            disabled={!room || (room.status === 'playing' && isDrawer)}
          />
        </div>

      </div>
    </div>
  );
}