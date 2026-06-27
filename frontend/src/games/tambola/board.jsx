import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { connectSocket } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby';
import VoiceChat from '../../components/VoiceChat';

// Extended claims with descriptions for the Info Modal
const CLAIMS = [
  { id: 'early5', label: 'Early 5', desc: 'First 5 numbers marked anywhere on your ticket.' },
  { id: 'topLine', label: 'Top Line', desc: 'All 5 numbers in the first (top) row.' },
  { id: 'middleLine', label: 'Middle Line', desc: 'All 5 numbers in the second (middle) row.' },
  { id: 'bottomLine', label: 'Bottom Line', desc: 'All 5 numbers in the third (bottom) row.' },
  { id: 'fourCorners', label: '4 Corners', desc: 'The first and last numbers of both the top and bottom rows (4 numbers).' },
  { id: 'ladoo', label: 'Ladoo', desc: 'The exact center number of your ticket (3rd number of the middle row).' },
  { id: 'kingCorner', label: 'King Corner', desc: 'First number of top row & last number of bottom row (2 numbers).' },
  { id: 'queenCorner', label: 'Queen Corner', desc: 'Last number of top row & first number of bottom row (2 numbers).' },
  { id: 'smallest3', label: 'Smallest 3', desc: 'The 3 absolute lowest numbers on your ticket.' },
  { id: 'largest3', label: 'Largest 3', desc: 'The 3 absolute highest numbers on your ticket.' },
  { id: 'fullHouse', label: 'Full House', desc: 'Every single number on your ticket is marked.' },
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
    <div className="flex flex-col w-full h-[400px] lg:h-[550px] shrink-0 bg-[#333333] border-[3px] border-black rounded-lg shadow-[6px_6px_0px_#000] rotate-1 text-white">
      <div className="px-4 py-3 sm:py-4 border-b-[3px] border-black font-bold tracking-widest text-xs uppercase text-gray-200 bg-[#222]">
        Room Chat
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 text-sm scrollbar-thin scrollbar-thumb-gray-600 bg-[#333]">
        {(!messages || messages.length === 0) && (
          <p className="text-gray-400 text-center py-4 font-bold italic">No messages yet</p>
        )}
        {messages?.map((msg, idx) => (
          <div key={msg.id || idx} className="break-words">
            <span className="font-black text-[#facc15] uppercase tracking-wider">{msg.playerName}: </span>
            <span className="text-gray-100 font-medium">{msg.message}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-2 sm:p-3 border-t-[3px] border-black flex gap-2 bg-[#2a2a2a] rounded-b-lg">
        <input
          type="text"
          className="py-1.5 sm:py-2 px-3 rounded text-sm flex-1 bg-black border-[2px] border-black text-white focus:outline-none focus:ring-2 focus:ring-[#facc15]"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          maxLength={500}
        />
        <button 
          type="submit" 
          className="bg-[#facc15] text-black font-black uppercase border-[2px] border-black rounded px-3 sm:px-4 py-1.5 sm:py-2 shadow-[3px_3px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_#000] transition-all disabled:opacity-50" 
          disabled={disabled}
        >
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
  
  const [isAutoDrawing, setIsAutoDrawing] = useState(false);
  const [isSoundEnabled, setIsSoundEnabled] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [chatToast, setChatToast] = useState(null);

  const prevDrawnLength = useRef(0);
  const chatRef = useRef(null);
  const DRAW_SPEED_MS = 3500;

  const currentUsername = sessionStorage.getItem('playerName') 
    || localStorage.getItem('pohahub_username') 
    || 'Player';

  useEffect(() => {
    if (!room?.gameState?.drawnNumbers) return;
    const currentLength = room.gameState.drawnNumbers.length;
    
    if (currentLength > prevDrawnLength.current) {
      const newDrawn = room.gameState.drawnNumbers[currentLength - 1];
      if (isSoundEnabled && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(newDrawn.toString());
        utterance.rate = 0.9;
        window.speechSynthesis.speak(utterance);
      }
    }
    prevDrawnLength.current = currentLength;
  }, [room?.gameState?.drawnNumbers, isSoundEnabled]);

  useEffect(() => {
    socket.emit('room:join', { roomCode, playerName: currentUsername }, (result) => {
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
      
      if (msg.playerName !== currentUsername && window.innerWidth < 1024) {
        setChatToast(msg);
        setTimeout(() => setChatToast(null), 3500); 
      }
    };

    socket.on('room:update', handleRoomUpdate);
    socket.on('chat:message', handleChatMessage);

    return () => {
      socket.off('room:update', handleRoomUpdate);
      socket.off('chat:message', handleChatMessage);
    };
  }, [roomCode, socket, currentUsername]);

  useEffect(() => {
    let timer;
    if (isAutoDrawing && room?.gameState?.status === 'playing') {
      timer = setInterval(() => {
        socket.emit('game:move', { action: 'draw' }, (result) => {
          if (!result.ok) {
            if (result.error === 'All numbers have been drawn') setIsAutoDrawing(false);
            else {
              setErrorToast(result.error || 'Could not draw');
              setTimeout(() => setErrorToast(''), 3000);
            }
          }
        });
      }, DRAW_SPEED_MS);
    }
    return () => clearInterval(timer);
  }, [isAutoDrawing, room?.gameState?.status, socket]);

  if (!room) return (
    <div className="min-h-screen flex items-center justify-center font-bold text-black uppercase tracking-widest text-xl animate-pulse">
        Connecting...
    </div>
  );

  const playerId = room?.viewerId;
  const isHost = room?.hostId === playerId;
  const gameState = room?.gameState;
  const me = gameState?.players?.find((p) => p.id === playerId);

  if (room?.status === 'waiting') {
    return (
      <WaitingLobby
        roomCode={room?.code}
        isHost={isHost}
        playerCount={room?.players?.length || 0}
        players={room?.players || []}
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
    const isDrawn = gameState?.drawnNumbers?.includes(num);
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

  const scrollToChat = () => {
    setChatToast(null);
    chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const lastDrawn = gameState?.drawnNumbers?.length > 0 
    ? gameState.drawnNumbers[gameState.drawnNumbers.length - 1] 
    : '--';

  return (
    <div className="relative min-h-[85vh] w-full flex flex-col items-center font-sans text-black overflow-x-hidden px-4 sm:px-6 py-4 sm:py-8">
      
      <style>{`
        @keyframes popIn { 0% { opacity: 0; transform: scale(0.8) translateY(30px) rotate(-5deg); } 100% { opacity: 1; transform: scale(1) translateY(0) rotate(-2deg); } }
        .animate-pop-in { animation: popIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; }
      `}</style>

      {/* ERROR TOAST Z-INDEX AND POSITION FIXED HERE (z-[999] top-24) */}
      {errorToast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 bg-[#ef4444] border-[3px] border-black text-white px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base font-black uppercase rounded shadow-[6px_6px_0px_#000] z-[999] animate-bounce whitespace-nowrap tracking-widest">
          {errorToast}
        </div>
      )}

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

      {showRules && (
        <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border-[4px] border-black rounded-lg p-6 sm:p-8 w-full max-w-lg shadow-[12px_12px_0px_#000] max-h-[80vh] flex flex-col -rotate-1 animate-pop-in">
            <div className="flex justify-between items-center mb-6 border-b-[4px] border-black pb-4">
              <h2 className="text-3xl font-black text-black uppercase tracking-widest">Tambola Rules</h2>
              <button 
                onClick={() => setShowRules(false)} 
                className="bg-[#ef4444] text-black font-black border-[3px] border-black shadow-[3px_3px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_#000] w-10 h-10 flex items-center justify-center rounded"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-gray-800 flex-1">
              {CLAIMS.map(c => (
                <div key={c.id} className="bg-gray-100 border-[3px] border-black p-4 rounded shadow-[4px_4px_0px_rgba(0,0,0,0.1)]">
                  <h4 className="font-black text-xl text-[#3b82f6] uppercase">{c.label}</h4>
                  <p className="text-sm font-bold text-gray-700 mt-1">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {gameState?.status === 'finished' && (
        <div className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex flex-col items-center p-4 sm:p-10 overflow-y-auto">
          <h1 
            className="text-[clamp(2rem,7vw,5rem)] font-black text-[#facc15] mb-6 mt-10 text-center uppercase tracking-tighter"
            style={{ WebkitTextStroke: '3px black', textShadow: '6px 6px 0px #000' }}
          >
            Game Over!
          </h1>
          <div className="w-full max-w-3xl bg-white border-[4px] border-black rounded-lg p-4 sm:p-8 shadow-[12px_12px_0px_#000] mb-10 rotate-1 animate-pop-in">
            <h2 className="text-2xl sm:text-4xl font-black text-black mb-6 border-b-[4px] border-black pb-4 text-center tracking-widest uppercase">
              Final Results
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {CLAIMS.map(claim => {
                const winnerId = gameState?.activeClaims?.[claim.id];
                const winner = winnerId ? gameState?.players?.find(p => p.id === winnerId) : null;
                return (
                  <div key={claim.id} className={`flex justify-between items-center p-4 rounded border-[3px] border-black shadow-[4px_4px_0px_#000] ${winner ? 'bg-[#10b981]' : 'bg-gray-200'}`}>
                    <span className="font-black uppercase text-sm sm:text-base text-black">{claim.label}</span>
                    <span className="font-bold text-sm sm:text-base text-black bg-white border-[2px] border-black px-2 py-1 rounded">
                      {winner ? winner.name : 'Unclaimed'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="w-full max-w-[1400px] flex flex-col lg:flex-row justify-center items-start gap-6 lg:gap-8">
        
        <div className="w-full lg:w-1/4 flex flex-col gap-6 order-1">
          <div className="bg-[#333333] border-[3px] border-black rounded-lg p-4 sm:p-6 text-center shadow-[8px_8px_0px_#000] w-full -rotate-1 text-white">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs sm:text-sm text-[#facc15] uppercase tracking-widest font-black flex-1">Last Drawn</h3>
              <button 
                onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                className={`w-10 h-10 border-[2px] border-black rounded flex items-center justify-center shadow-[3px_3px_0px_#000] transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[1px_1px_0px_#000] ${isSoundEnabled ? 'bg-[#facc15] text-black' : 'bg-gray-300 text-gray-500'}`}
                title="Toggle Announcer"
              >
                {isSoundEnabled ? '🔊' : '🔇'}
              </button>
            </div>
            
            <div className="text-[clamp(2.5rem,8vw,6rem)] font-black text-white my-4 bg-black border-[4px] border-[#facc15] rounded-xl py-6 shadow-[inset_0_0_20px_rgba(250,204,21,0.2)]">
              {lastDrawn}
            </div>

            {/* 🔥 PREVIOUS DRAWS FEATURE ADDED HERE 🔥 */}
            {gameState?.drawnNumbers?.length > 1 && (
              <div className="mt-4 pt-4 border-t-[2px] border-black/30 w-full">
                <p className="text-[10px] uppercase font-black text-gray-400 mb-2 tracking-widest">Previous Draws</p>
                <div className="flex justify-center gap-2 opacity-90">
                  {gameState.drawnNumbers.slice(-4, -1).map((num, index) => (
                    <span key={index} className="bg-gray-200 border-[2px] border-black rounded-full w-8 sm:w-10 h-8 sm:h-10 flex items-center justify-center text-xs sm:text-sm font-black text-black shadow-[2px_2px_0px_#000]">
                      {num}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {isHost && gameState?.status === 'playing' && (
              <div className="mt-6 flex flex-col gap-3">
                <button
                  onClick={() => setIsAutoDrawing(!isAutoDrawing)}
                  className={`w-full py-3 text-sm lg:text-base font-black uppercase rounded border-[3px] border-black transition-all shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] flex items-center justify-center gap-2 text-black ${
                    isAutoDrawing ? 'bg-[#ef4444]' : 'bg-[#10b981]'
                  }`}
                >
                  {isAutoDrawing ? '⏸ Pause Auto' : '▶️ Start Auto'}
                </button>
                <button 
                  onClick={handleDraw} 
                  disabled={isAutoDrawing}
                  className="w-full py-3 bg-[#3b82f6] disabled:bg-gray-400 disabled:shadow-none disabled:translate-y-0 disabled:translate-x-0 disabled:cursor-not-allowed text-white text-sm lg:text-base font-black uppercase rounded border-[3px] border-black transition-all shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000]"
                >
                  Draw 1 Number
                </button>
              </div>
            )}
          </div>

          <div className="bg-white border-[3px] border-black rounded-lg p-3 sm:p-5 shadow-[6px_6px_0px_#000] w-full flex-1 rotate-1">
            <h3 className="text-xs sm:text-sm text-black uppercase tracking-widest font-black mb-4 text-center">Numbers Board</h3>
            <div className="grid grid-cols-10 gap-1 text-center">
              {Array.from({ length: 90 }, (_, i) => i + 1).map((num) => {
                const isDrawn = gameState?.drawnNumbers?.includes(num);
                return (
                  <div 
                    key={num} 
                    className={`text-[9px] sm:text-[10px] lg:text-xs py-1 rounded-[2px] border-[2px] border-black font-black transition-all duration-150 flex items-center justify-center aspect-square sm:aspect-auto ${
                      isDrawn ? 'bg-[#facc15] text-black scale-125 shadow-[2px_2px_0px_#000] z-10' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {num}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="w-full lg:w-2/4 flex flex-col gap-6 order-2">
          <div className="bg-[#3b82f6] border-[4px] border-black rounded-xl p-4 sm:p-6 shadow-[8px_8px_0px_#000] w-full text-white">
            <h2 className="text-2xl sm:text-3xl font-black mb-4 uppercase tracking-wider text-white" style={{ WebkitTextStroke: '1px black' }}>Your Ticket</h2>
            
            {me?.ticket ? (
              <div className="w-full pb-2">
                <div className="flex flex-col gap-2 w-full bg-white p-2 border-[4px] border-black rounded-lg shadow-[inset_4px_4px_0px_rgba(0,0,0,0.15)]">
                  {me.ticket.map((row, rIdx) => (
                    <div key={rIdx} className="grid grid-cols-9 gap-1 sm:gap-2 w-full">
                      {row?.map((num, cIdx) => {
                        const isMarked = num !== null && markedNumbers.has(num);
                        
                        let cellStyle = "bg-gray-200 border-[2px] border-gray-400 text-transparent";
                        if (num !== null) {
                          if (isMarked) {
                            cellStyle = "bg-[#ef4444] text-white border-[3px] border-black shadow-[inset_3px_3px_0px_rgba(0,0,0,0.3)]";
                          } else {
                            cellStyle = "bg-white text-black border-[3px] border-black hover:bg-[#facc15] hover:-translate-y-1 hover:shadow-[3px_3px_0px_#000] cursor-pointer shadow-[1px_1px_0px_#000]";
                          }
                        }

                        return (
                          <div
                            key={cIdx}
                            onClick={() => num !== null && toggleMark(num)}
                            className={`relative h-8 sm:h-10 lg:h-14 flex items-center justify-center text-xs sm:text-sm lg:text-xl font-black rounded transition-all select-none ${cellStyle}`}
                          >
                            {num !== null ? num : ''}
                            {isMarked && (
                              <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-80">
                                <div className="w-full h-1 bg-black -rotate-45 absolute"></div>
                                <div className="w-full h-1 bg-black rotate-45 absolute"></div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 sm:py-10 text-lg font-bold bg-white text-black border-[3px] border-black rounded shadow-[inset_4px_4px_0px_rgba(0,0,0,0.1)]">
                Waiting for ticket generation or spectating...
              </div>
            )}
          </div>

          <div className="bg-white border-[3px] border-black rounded-xl p-4 sm:p-6 shadow-[8px_8px_0px_#000] w-full rotate-1">
            <div className="flex justify-between items-center mb-4 border-b-[3px] border-black pb-3">
              <h2 className="text-xl sm:text-2xl font-black text-black uppercase tracking-widest">Prizes</h2>
              <button 
                onClick={() => setShowRules(true)} 
                className="bg-[#facc15] text-black border-[2px] border-black shadow-[3px_3px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_#000] text-sm font-black w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all"
                title="View Rules"
              >
                ?
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {CLAIMS.map((claim) => {
                const winnerId = gameState?.activeClaims?.[claim.id];
                const winner = winnerId ? gameState?.players?.find((p) => p.id === winnerId) : null;

                return (
                  <button
                    key={claim.id}
                    onClick={() => !winnerId && handleClaim(claim.id)}
                    disabled={!!winnerId || !me}
                    className={`p-2 sm:p-3 rounded border-[3px] border-black flex flex-col items-center justify-center transition-all ${
                      winnerId
                        ? winnerId === playerId
                          ? 'bg-[#10b981] text-black shadow-[2px_2px_0px_#000]'
                          : 'bg-gray-300 text-gray-500 opacity-80 cursor-not-allowed'
                        : 'bg-[#3b82f6] hover:bg-[#facc15] text-white hover:text-black shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000]'
                    }`}
                  >
                    <span className="font-black uppercase text-xs sm:text-sm">{claim.label}</span>
                    <span className="text-[10px] sm:text-xs mt-1 font-bold text-center truncate w-full bg-white border-[2px] border-black px-1 py-0.5 rounded text-black">
                      {winner ? `Won by ${winner.name}` : 'Claim'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        <div ref={chatRef} className="w-full lg:w-1/4 flex flex-col order-3 h-72 lg:h-auto pb-8 lg:pb-0 mt-4 lg:mt-0 scroll-mt-24">
          <ChatPanel
            messages={room?.chat ?? []}
            onSend={(message) => socket.emit('chat:message', { message })}
            disabled={room?.status === 'waiting'}
          />
        </div>

      </div>
    </div>
  );
}