import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { connectSocket } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby';

const CLAIMS = [
  { id: 'early5', label: 'Early 5' },
  { id: 'topLine', label: 'Top Line' },
  { id: 'middleLine', label: 'Middle Line' },
  { id: 'bottomLine', label: 'Bottom Line' },
  { id: 'fourCorners', label: '4 Corners' },
  { id: 'fullHouse', label: 'Full House' },
];

// --- CHAT PANEL COMPONENT ---
function ChatPanel({ messages, onSend, disabled }) {
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
    <div className="bg-[#111]/80 backdrop-blur-md border border-white/10 rounded-2xl flex flex-col h-full min-h-[350px] lg:max-h-[600px] shadow-xl overflow-hidden">
      <div className="px-4 py-4 border-b border-white/[0.05] font-bold tracking-widest text-xs uppercase text-gray-400 bg-black/20">
        Room Chat
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 text-sm scrollbar-thin scrollbar-thumb-gray-800">
        {messages.length === 0 && (
          <p className="text-gray-600 text-center py-4 font-light italic">No messages yet</p>
        )}
        {messages.map((msg, idx) => (
          <div key={msg.id || idx} className="break-words">
            <span className="font-semibold text-gray-300">{msg.playerName}: </span>
            <span className="text-gray-400 font-light">{msg.message}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-3 border-t border-white/[0.05] flex gap-2 bg-black/20">
        <input
          type="text"
          className="py-2 px-3 rounded-lg text-sm flex-1 bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          maxLength={500}
        />
        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors" disabled={disabled}>
          Send
        </button>
      </form>
    </div>
  );
}

// --- MAIN BOARD COMPONENT ---
export default function TambolaBoard() {
  const { roomCode } = useParams();
  const socket = connectSocket();
  const [room, setRoom] = useState(null);
  const [markedNumbers, setMarkedNumbers] = useState(new Set());
  const [errorToast, setErrorToast] = useState('');
  
  // Host Auto-Draw State
  const [isAutoDrawing, setIsAutoDrawing] = useState(false);
  const DRAW_SPEED_MS = 3500; // 3.5 seconds per draw

  useEffect(() => {
    const pName = sessionStorage.getItem('playerName')
      || localStorage.getItem('pohahub_username')
      || 'Player';

    socket.emit('room:join', { roomCode, playerName: pName }, (result) => {
      if (!result.ok) {
        setErrorToast(result.error || 'Failed to join room');
        setTimeout(() => setErrorToast(''), 3000);
        return;
      }
      setRoom(result.room);
    });

    const handleRoomUpdate = (updatedRoom) => setRoom(updatedRoom);
    const handleChatMessage = (msg) => {
      setRoom((prev) => prev ? { ...prev, chat: [...(prev.chat ?? []), msg] } : prev);
    };

    socket.on('room:update', handleRoomUpdate);
    socket.on('chat:message', handleChatMessage);

    return () => {
      socket.off('room:update', handleRoomUpdate);
      socket.off('chat:message', handleChatMessage);
    };
  }, [roomCode, socket]);

  // Host Auto-Draw Loop
  useEffect(() => {
    let timer;
    if (isAutoDrawing && room?.gameState?.status === 'playing') {
      timer = setInterval(() => {
        socket.emit('game:move', { action: 'draw' }, (result) => {
          if (!result.ok) {
            if (result.error === 'All numbers have been drawn') {
              setIsAutoDrawing(false);
            } else {
              setErrorToast(result.error || 'Could not draw');
              setTimeout(() => setErrorToast(''), 3000);
            }
          }
        });
      }, DRAW_SPEED_MS);
    }
    return () => clearInterval(timer);
  }, [isAutoDrawing, room?.gameState?.status, socket]);

  if (!room) return <div className="min-h-screen flex items-center justify-center text-white">Connecting...</div>;

  const playerId = room.viewerId;
  const isHost = room.hostId === playerId;

  if (room.status === 'waiting') {
    return (
      <WaitingLobby
        roomCode={room.code}
        isHost={isHost}
        playerCount={room.players.length}
        onStart={() => socket.emit('room:start', {}, (result) => {
          if (!result.ok) {
            setErrorToast(result.error || 'Failed to start game');
            setTimeout(() => setErrorToast(''), 3000);
          }
        })}
        gamePath="tambola/room"
      />
    );
  }

  const gameState = room.gameState;
  const me = gameState.players.find((p) => p.id === playerId);

  const handleDraw = () => {
    socket.emit('game:move', { action: 'draw' }, (result) => {
      if (!result.ok) {
        setErrorToast(result.error || 'Could not draw');
        setTimeout(() => setErrorToast(''), 3000);
      }
    });
  };

  const handleClaim = (pattern) => {
    socket.emit('game:move', { action: 'claim', pattern }, (result) => {
      if (!result.ok) {
        setErrorToast(result.error || 'Invalid claim');
        setTimeout(() => setErrorToast(''), 3000);
      }
    });
  };

  const toggleMark = (num) => {
    const isDrawn = gameState.drawnNumbers.includes(num);
    if (!isDrawn) {
      setErrorToast(`Number ${num} hasn't been drawn yet!`);
      setTimeout(() => setErrorToast(''), 2000);
      return;
    }

    setMarkedNumbers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(num)) newSet.delete(num);
      else newSet.add(num);
      return newSet;
    });
  };

  const handleSendChat = (message) => {
    socket.emit('chat:message', { message });
  };

  const lastDrawn = gameState.drawnNumbers.length > 0 
    ? gameState.drawnNumbers[gameState.drawnNumbers.length - 1] 
    : '--';

  return (
    <div className="relative min-h-[85vh] text-gray-200 overflow-hidden px-4 py-8">
      
      {/* Toast Error */}
      {errorToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 bg-red-500 text-white px-6 py-3 rounded-full shadow-lg z-50 animate-bounce">
          {errorToast}
        </div>
      )}

      {/* Game Over Screen */}
      {gameState.status === 'finished' && (
        <div className="absolute inset-0 z-40 bg-[#0a0a0c]/90 backdrop-blur-md flex flex-col items-center justify-center rounded-2xl">
          <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 mb-4 animate-pulse">
            Game Over!
          </h1>
          <p className="text-xl text-gray-300">All Full House prizes claimed.</p>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-6">
        
        {/* LEFT COLUMN: Caller Console & Drawn Board */}
        <div className="lg:w-1/4 flex flex-col gap-6 order-1">
          <div className="bg-[#111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center shadow-xl">
            <h3 className="text-sm text-gray-400 uppercase tracking-widest font-semibold mb-2">Last Drawn</h3>
            <div className="text-7xl xl:text-8xl font-black text-blue-400 my-4 drop-shadow-[0_0_20px_rgba(96,165,250,0.4)]">
              {lastDrawn}
            </div>
            
            {isHost && gameState.status === 'playing' && (
              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={() => setIsAutoDrawing(!isAutoDrawing)}
                  className={`w-full py-3 font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                    isAutoDrawing
                      ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30'
                      : 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30'
                  }`}
                >
                  {isAutoDrawing ? '⏸ Pause Auto-Draw' : '▶️ Start Auto-Draw'}
                </button>

                <button 
                  onClick={handleDraw} 
                  disabled={isAutoDrawing}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)]"
                >
                  Draw 1 Number
                </button>
              </div>
            )}
          </div>

          <div className="bg-[#111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl flex-1">
            <h3 className="text-sm text-gray-400 uppercase tracking-widest font-semibold mb-4 text-center">Numbers Board</h3>
            <div className="grid grid-cols-10 gap-1 text-center">
              {Array.from({ length: 90 }, (_, i) => i + 1).map((num) => {
                const isDrawn = gameState.drawnNumbers.includes(num);
                return (
                  <div 
                    key={num} 
                    className={`text-[9px] xl:text-xs py-1 xl:py-1.5 rounded-sm transition-all duration-300 ${
                      isDrawn ? 'bg-blue-500/80 text-white font-bold scale-110 shadow-sm z-10' : 'bg-white/5 text-gray-600'
                    }`}
                  >
                    {num}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* MIDDLE COLUMN: Player Ticket & Claims */}
        <div className="lg:w-2/4 flex flex-col gap-6 order-2">
          
          {/* Ticket UI */}
          <div className="bg-[#111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl overflow-x-auto scrollbar-thin scrollbar-thumb-gray-700">
            <h2 className="text-xl font-bold mb-4 text-gray-200">Your Ticket</h2>
            {me ? (
              <div className="flex flex-col gap-2 min-w-[450px]">
                {me.ticket.map((row, rIdx) => (
                  <div key={rIdx} className="grid grid-cols-9 gap-1 sm:gap-2">
                    {row.map((num, cIdx) => {
                      const isDrawn = num !== null && gameState.drawnNumbers.includes(num);
                      const isMarked = num !== null && markedNumbers.has(num);
                      
                      let cellStyle = "bg-transparent";
                      if (num !== null) {
                        if (isMarked) {
                          cellStyle = "bg-white/5 text-gray-300 shadow-inner";
                        } else if (isDrawn) {
                          cellStyle = "bg-blue-500/20 hover:bg-blue-500/40 text-blue-100 cursor-pointer shadow-[0_0_10px_rgba(59,130,246,0.3)] border border-blue-400/50";
                        } else {
                          cellStyle = "bg-white/5 text-gray-600 opacity-40 cursor-not-allowed";
                        }
                      }

                      return (
                        <div
                          key={cIdx}
                          onClick={() => num !== null && toggleMark(num)}
                          className={`relative h-12 sm:h-14 lg:h-16 flex items-center justify-center text-base sm:text-lg lg:text-xl font-black rounded-lg sm:rounded-xl transition-all select-none ${cellStyle}`}
                        >
                          {num !== null ? num : ''}
                          
                          {/* Authentic Red Circular Stamp Marker */}
                          {isMarked && (
                            <div className="absolute w-8 h-8 sm:w-10 sm:h-10 rounded-full border-[3px] border-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.3)] pointer-events-none scale-110 sm:scale-125"></div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-500">You are spectating.</div>
            )}
          </div>

          {/* Claim Buttons */}
          <div className="bg-[#111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-gray-200">Prizes & Claims</h2>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {CLAIMS.map((claim) => {
                const winnerId = gameState.activeClaims[claim.id];
                const winner = winnerId ? gameState.players.find((p) => p.id === winnerId) : null;

                return (
                  <button
                    key={claim.id}
                    onClick={() => !winnerId && handleClaim(claim.id)}
                    disabled={!!winnerId || !me}
                    className={`p-3 rounded-xl flex flex-col items-center justify-center transition-all ${
                      winnerId
                        ? winnerId === playerId
                          ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                          : 'bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                    }`}
                  >
                    <span className="font-bold text-sm sm:text-base">{claim.label}</span>
                    <span className="text-xs mt-1 font-medium text-center">
                      {winner ? `Won by ${winner.name}` : 'Claim'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Chat Panel */}
        <div className="lg:w-1/4 flex flex-col order-3">
          <ChatPanel
            messages={room.chat ?? []}
            onSend={handleSendChat}
            disabled={room.status === 'waiting'}
          />
        </div>

      </div>
    </div>
  );
}