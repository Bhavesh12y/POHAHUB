export default function TambolaBoard() {
  const { roomCode } = useParams();
  const socket = connectSocket();
  const [room, setRoom] = useState(null);
  const [markedNumbers, setMarkedNumbers] = useState(new Set());
  const [errorToast, setErrorToast] = useState('');

  useEffect(() => {
    const pName = sessionStorage.getItem('playerName')
      || localStorage.getItem('pohahub_username')
      || 'Player';

    // Joins (or re-joins/reconnects to) the room over the existing socket.
    socket.emit('room:join', { roomCode, playerName: pName }, (result) => {
      if (!result.ok) {
        setErrorToast(result.error || 'Failed to join room');
        setTimeout(() => setErrorToast(''), 3000);
        return;
      }
      setRoom(result.room);
    });

    const handleRoomUpdate = (updatedRoom) => setRoom(updatedRoom);
    socket.on('room:update', handleRoomUpdate);

    return () => {
      socket.off('room:update', handleRoomUpdate);
    };
  }, [roomCode]);

  if (!room) return <div className="min-h-screen flex items-center justify-center text-white">Connecting...</div>;

  // viewerId is sent by the server per-socket, so it's always correct — even after reconnects.
  const playerId = room.viewerId;
  const isHost = room.hostId === playerId;

  if (room.status === 'waiting') {
    return (
      <WaitingLobby
        room={room}
        isHost={isHost}
        onStart={() => socket.emit('room:start', {}, (result) => {
          if (!result.ok) {
            setErrorToast(result.error || 'Failed to start game');
            setTimeout(() => setErrorToast(''), 3000);
          }
        })}
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
    setMarkedNumbers((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(num)) newSet.delete(num);
      else newSet.add(num);
      return newSet;
    });
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

      <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* LEFT COLUMN: Caller Console & Drawn Board */}
        <div className="lg:w-1/3 flex flex-col gap-6">
          <div className="bg-[#111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center shadow-xl">
            <h3 className="text-sm text-gray-400 uppercase tracking-widest font-semibold mb-2">Last Drawn</h3>
            <div className="text-8xl font-black text-blue-400 my-4 drop-shadow-[0_0_20px_rgba(96,165,250,0.4)]">
              {lastDrawn}
            </div>
            
            {isHost && gameState.status === 'playing' && (
              <button 
                onClick={handleDraw} 
                className="mt-4 w-full py-4 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)]"
              >
                Draw Number
              </button>
            )}
          </div>

          <div className="bg-[#111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-4 shadow-xl">
            <h3 className="text-sm text-gray-400 uppercase tracking-widest font-semibold mb-4 text-center">Numbers Board</h3>
            <div className="grid grid-cols-10 gap-1 text-center">
              {Array.from({ length: 90 }, (_, i) => i + 1).map((num) => {
                const isDrawn = gameState.drawnNumbers.includes(num);
                return (
                  <div 
                    key={num} 
                    className={`text-[10px] sm:text-xs py-1.5 rounded-sm transition-all duration-300 ${
                      isDrawn ? 'bg-blue-500/80 text-white font-bold scale-110 shadow-sm' : 'bg-white/5 text-gray-600'
                    }`}
                  >
                    {num}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Player Ticket & Claims */}
        <div className="lg:w-2/3 flex flex-col gap-6">
          
          {/* Ticket UI */}
          <div className="bg-[#111]/80 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl overflow-x-auto">
            <h2 className="text-xl font-bold mb-4 text-gray-200">Your Ticket</h2>
            {me ? (
              <div className="flex flex-col gap-2 min-w-[500px]">
                {me.ticket.map((row, rIdx) => (
                  <div key={rIdx} className="grid grid-cols-9 gap-2">
                    {row.map((num, cIdx) => {
                      const isMarked = num !== null && markedNumbers.has(num);
                      return (
                        <div
                          key={cIdx}
                          onClick={() => num !== null && toggleMark(num)}
                          className={`relative h-14 sm:h-16 flex items-center justify-center text-lg sm:text-xl font-black rounded-xl transition-all select-none ${
                            num === null 
                              ? 'bg-transparent' 
                              : isMarked 
                                ? 'bg-white/5 text-gray-300 cursor-pointer shadow-inner' 
                                : 'bg-white/10 hover:bg-white/20 text-white cursor-pointer shadow-md border border-white/5'
                          }`}
                        >
                          {num !== null ? num : ''}
                          
                          {/* Authentic Red Circular Stamp Marker */}
                          {isMarked && (
                            <div className="absolute w-10 h-10 rounded-full border-[3px] border-red-500/80 shadow-[0_0_10px_rgba(239,68,68,0.3)] pointer-events-none scale-110"></div>
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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
                    <span className="text-xs mt-1 font-medium">
                      {winner ? `Won by ${winner.name}` : 'Claim'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}