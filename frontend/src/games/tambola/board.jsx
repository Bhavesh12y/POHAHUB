import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { connectSocket } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby';

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
    <div className="bg-[#111]/80 backdrop-blur-md border border-white/10 rounded-2xl flex flex-col h-full min-h-[300px] lg:max-h-[600px] shadow-xl overflow-hidden w-full">
      <div className="px-4 py-3 sm:py-4 border-b border-white/[0.05] font-bold tracking-widest text-[10px] sm:text-xs uppercase text-gray-400 bg-black/20">
        Room Chat
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2 sm:space-y-3 text-xs sm:text-sm scrollbar-thin scrollbar-thumb-gray-800">
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
      <form onSubmit={handleSubmit} className="p-2 sm:p-3 border-t border-white/[0.05] flex gap-2 bg-black/20">
        <input
          type="text"
          className="py-1.5 sm:py-2 px-3 rounded-lg text-xs sm:text-sm flex-1 bg-black/50 border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          maxLength={500}
        />
        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-medium transition-colors" disabled={disabled}>
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
  const [chatToast, setChatToast] = useState(null); // Mobile chat notification

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
      
      // Trigger mobile toast if message isn't from me and screen is < 1024px
      if (msg.playerName !== currentUsername && window.innerWidth < 1024) {
        setChatToast(msg);
        setTimeout(() => setChatToast(null), 3500); // Hide after 3.5s
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

  if (!room) return <div className="min-h-screen flex items-center justify-center text-white">Connecting...</div>;

  const playerId = room.viewerId;
  const isHost = room.hostId === playerId;
  const gameState = room.gameState;
  const me = gameState?.players.find((p) => p.id === playerId);

  if (room.status === 'waiting') {
    return (
      <WaitingLobby
        roomCode={room.code}
        isHost={isHost}
        playerCount={room.players.length}
        players={room.players}
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

  const scrollToChat = () => {
    setChatToast(null);
    chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const lastDrawn = gameState.drawnNumbers.length > 0 
    ? gameState.drawnNumbers[gameState.drawnNumbers.length - 1] 
    : '--';

  return (
    <div className="relative min-h-[85vh] text-gray-200 overflow-x-hidden px-2 sm:px-4 py-4 sm:py-8 w-full max-w-[100vw]">
      
      {/* Toast Error */}
      {errorToast && (
        <div className="fixed top-16 sm:top-20 left-1/2 -translate-x-1/2 bg-red-500 text-white px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-full shadow-lg z-50 animate-bounce whitespace-nowrap">
          {errorToast}
        </div>
      )}

      {/* Mobile Chat Notification Toast */}
      {chatToast && (
        <div 
          onClick={scrollToChat}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-blue-600/95 backdrop-blur shadow-2xl border border-blue-400/50 text-white px-4 py-3 rounded-2xl z-50 flex items-center gap-3 cursor-pointer w-11/12 max-w-sm lg:hidden animate-[popIn_0.3s_ease-out]"
        >
          <span className="bg-white/20 p-2 rounded-full leading-none">💬</span>
          <div className="flex flex-col flex-1 truncate">
            <span className="text-xs font-bold text-blue-200">{chatToast.playerName}</span>
            <span className="text-sm truncate">{chatToast.message}</span>
          </div>
          <span className="text-xs text-blue-200 bg-black/20 px-2 py-1 rounded">View</span>
        </div>
      )}

      {/* Rules Modal */}
      {showRules && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111] border border-white/10 rounded-2xl p-6 sm:p-8 w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-4">
              <h2 className="text-2xl font-bold text-white">Tambola Rules</h2>
              <button onClick={() => setShowRules(false)} className="text-gray-400 hover:text-white bg-white/5 p-2 rounded-full">
                ✕
              </button>
            </div>
            <div className="overflow-y-auto pr-2 space-y-4 scrollbar-thin scrollbar-thumb-gray-700 flex-1">
              {CLAIMS.map(c => (
                <div key={c.id} className="bg-white/5 p-3 rounded-lg">
                  <h4 className="font-bold text-blue-400">{c.label}</h4>
                  <p className="text-sm text-gray-300 mt-1">{c.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Detailed Winning / Game Over Screen */}
      {gameState.status === 'finished' && (
        <div className="absolute inset-0 z-40 bg-[#0a0a0c]/95 backdrop-blur-md flex flex-col items-center p-4 sm:p-10 rounded-2xl overflow-y-auto">
          <h1 className="text-4xl sm:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-blue-500 mb-6 mt-10 animate-pulse text-center">
            Game Over!
          </h1>
          <div className="w-full max-w-3xl bg-[#111] border border-white/10 rounded-2xl p-4 sm:p-8 shadow-2xl mb-10">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-6 border-b border-white/10 pb-4 text-center tracking-widest uppercase">
              Final Results
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
              {CLAIMS.map(claim => {
                const winnerId = gameState.activeClaims[claim.id];
                const winner = winnerId ? gameState.players.find(p => p.id === winnerId) : null;
                return (
                  <div key={claim.id} className={`flex justify-between items-center p-3 sm:p-4 rounded-xl border transition-colors ${winner ? 'bg-green-500/10 border-green-500/30' : 'bg-white/5 border-white/5'}`}>
                    <span className="text-gray-300 font-medium text-sm sm:text-base">{claim.label}</span>
                    <span className={`font-bold text-sm sm:text-base ${winner ? 'text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]' : 'text-gray-600'}`}>
                      {winner ? winner.name : 'Unclaimed'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-[1400px] mx-auto flex flex-col lg:flex-row gap-4 sm:gap-6 w-full">
        
        {/* LEFT COLUMN: Caller Console & Drawn Board */}
        <div className="w-full lg:w-1/4 flex flex-col gap-4 sm:gap-6 order-1">
          <div className="bg-[#111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6 text-center shadow-xl w-full">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-xs sm:text-sm text-gray-400 uppercase tracking-widest font-semibold flex-1">Last Drawn</h3>
              <button 
                onClick={() => setIsSoundEnabled(!isSoundEnabled)}
                className={`p-2 rounded-full transition-colors flex items-center justify-center ${isSoundEnabled ? 'bg-blue-500/20 text-blue-400' : 'bg-white/5 text-gray-400 hover:bg-white/10'}`}
                title="Toggle Announcer"
              >
                {isSoundEnabled ? '🔊' : '🔇'}
              </button>
            </div>
            <div className="text-6xl sm:text-7xl xl:text-8xl font-black text-blue-400 my-2 sm:my-4 drop-shadow-[0_0_20px_rgba(96,165,250,0.4)]">
              {lastDrawn}
            </div>
            {isHost && gameState.status === 'playing' && (
              <div className="mt-4 sm:mt-6 flex flex-col gap-2 sm:gap-3">
                <button
                  onClick={() => setIsAutoDrawing(!isAutoDrawing)}
                  className={`w-full py-2 sm:py-3 text-xs sm:text-sm lg:text-base font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 ${
                    isAutoDrawing ? 'bg-red-500/20 text-red-400 border border-red-500/50 hover:bg-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30'
                  }`}
                >
                  {isAutoDrawing ? '⏸ Pause Auto' : '▶️ Start Auto'}
                </button>
                <button 
                  onClick={handleDraw} 
                  disabled={isAutoDrawing}
                  className="w-full py-2 sm:py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-xs sm:text-sm lg:text-base font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)]"
                >
                  Draw 1 Number
                </button>
              </div>
            )}
          </div>

          <div className="bg-[#111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-3 sm:p-4 shadow-xl w-full flex-1">
            <h3 className="text-xs sm:text-sm text-gray-400 uppercase tracking-widest font-semibold mb-3 sm:mb-4 text-center">Numbers Board</h3>
            <div className="grid grid-cols-10 gap-0.5 sm:gap-1 text-center">
              {Array.from({ length: 90 }, (_, i) => i + 1).map((num) => {
                const isDrawn = gameState.drawnNumbers.includes(num);
                return (
                  <div 
                    key={num} 
                    className={`text-[9px] sm:text-[10px] xl:text-xs py-1 rounded-[2px] sm:rounded-sm transition-all duration-300 flex items-center justify-center aspect-[4/5] sm:aspect-auto ${
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
        <div className="w-full lg:w-2/4 flex flex-col gap-4 sm:gap-6 order-2">
          
          {/* Ticket UI */}
          <div className="bg-[#111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-3 sm:p-6 shadow-xl w-full">
            <h2 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4 text-gray-200">Your Ticket</h2>
            {me ? (
              <div className="w-full pb-2">
                <div className="flex flex-col gap-1 sm:gap-2 w-full">
                  {me.ticket.map((row, rIdx) => (
                    <div key={rIdx} className="grid grid-cols-9 gap-0.5 sm:gap-2 w-full">
                      {row.map((num, cIdx) => {
                        const isDrawn = num !== null && gameState.drawnNumbers.includes(num);
                        const isMarked = num !== null && markedNumbers.has(num);
                        
                        let cellStyle = "bg-transparent";
                        if (num !== null) {
                          if (isMarked) cellStyle = "bg-white/5 text-gray-300 shadow-inner";
                          else if (isDrawn) cellStyle = "bg-blue-500/20 hover:bg-blue-500/40 text-blue-100 cursor-pointer shadow-[0_0_10px_rgba(59,130,246,0.3)] border border-blue-400/50";
                          else cellStyle = "bg-white/5 text-gray-600 opacity-40 cursor-not-allowed";
                        }

                        return (
                          <div
                            key={cIdx}
                            onClick={() => num !== null && toggleMark(num)}
                            className={`relative h-8 sm:h-12 lg:h-16 flex items-center justify-center text-[10px] sm:text-base lg:text-xl font-black rounded sm:rounded-xl transition-all select-none ${cellStyle}`}
                          >
                            {num !== null ? num : ''}
                            {isMarked && (
                              <div className="absolute w-5 h-5 sm:w-9 sm:h-9 lg:w-11 lg:h-11 rounded-full border-[1.5px] sm:border-[3px] border-red-500/80 shadow-[0_0_8px_rgba(239,68,68,0.3)] pointer-events-none scale-110 sm:scale-125"></div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-6 sm:py-10 text-sm sm:text-base text-gray-500">You are spectating.</div>
            )}
          </div>

          {/* Claim Buttons */}
          <div className="bg-[#111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 sm:p-6 shadow-xl w-full">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-lg sm:text-xl font-bold text-gray-200">Prizes & Claims</h2>
              <button 
                onClick={() => setShowRules(true)} 
                className="bg-white/10 hover:bg-white/20 text-gray-300 text-xs font-bold w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center transition-colors"
                title="View Rules"
              >
                i
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2 sm:gap-3">
              {CLAIMS.map((claim) => {
                const winnerId = gameState.activeClaims[claim.id];
                const winner = winnerId ? gameState.players.find((p) => p.id === winnerId) : null;

                return (
                  <button
                    key={claim.id}
                    onClick={() => !winnerId && handleClaim(claim.id)}
                    disabled={!!winnerId || !me}
                    className={`p-2 sm:p-3 rounded-lg flex flex-col items-center justify-center transition-all ${
                      winnerId
                        ? winnerId === playerId
                          ? 'bg-green-500/20 border border-green-500/50 text-green-400'
                          : 'bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/10 hover:shadow-[0_0_15px_rgba(255,255,255,0.05)]'
                    }`}
                  >
                    <span className="font-bold text-xs sm:text-sm">{claim.label}</span>
                    <span className="text-[9px] sm:text-[10px] mt-0.5 sm:mt-1 font-medium text-center truncate w-full px-1">
                      {winner ? `Won by ${winner.name}` : 'Claim'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Chat Panel */}
        <div ref={chatRef} className="w-full lg:w-1/4 flex flex-col order-3 h-[400px] lg:h-auto pb-8 lg:pb-0 scroll-mt-24">
          <ChatPanel
            messages={room.chat ?? []}
            onSend={(message) => socket.emit('chat:message', { message })}
            disabled={room.status === 'waiting'}
          />
        </div>

      </div>
    </div>
  );
}