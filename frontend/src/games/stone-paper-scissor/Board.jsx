import { useEffect, useState } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';
import WaitingLobby from '../../components/WaitingLobby';

const ICONS = { stone: '🪨', paper: '📄', scissor: '✂️', hidden: '❓' };

export default function Board() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [room, setRoom] = useState(location.state?.room ?? null);

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
      if (updatedRoom.code === roomCode?.toUpperCase()) setRoom(updatedRoom);
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

  console.log(room);
console.log(room.status);

 if (room.status === 'waiting') {
    return <WaitingLobby roomCode={room.code} isHost={isHost} playerCount={room.players.length} onStart={handleStart} gamePath="stone-paper-scissor" />;
  }

  // Prevents the "Cannot read currentRound of undefined" crash!
  if (!gameState) {
    return <div className="text-center py-24 text-black font-black uppercase tracking-widest text-xl animate-pulse">Loading Match...</div>;
  }



  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans">
      <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] p-6 rounded-lg -rotate-1 mb-8 flex justify-between items-center">
        <div>
          <p className="text-xs font-black tracking-widest text-gray-500 uppercase">Best of 3</p>
          <h2 className="text-2xl font-black uppercase text-[#f87171]">Round {gameState.currentRound}</h2>
        </div>
        <div className="text-right">
          <p className="text-xs font-black tracking-widest text-gray-500 uppercase">Scoreboard</p>
          <p className="text-xl font-bold uppercase">{me?.name}: {me?.score} | {opponent?.name || 'Waiting'}: {opponent?.score || 0}</p>
        </div>
      </div>

      {(gameState.status === 'won' || gameState.status === 'draw') ? (
        <div className="bg-[#fbbf24] border-[4px] border-black shadow-[12px_12px_0px_#000] p-10 text-center rounded-xl rotate-1">
          <h2 className="text-5xl font-black mb-4 uppercase">{gameState.status === 'draw' ? "It's a Draw!" : `${gameState.winner.name} Wins!`}</h2>
          <div className="flex justify-center gap-4 mt-8">
            {isHost && (
              <button onClick={resetGame} className="bg-[#86efac] text-black font-black uppercase border-[3px] border-black py-3 px-8 rounded shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000]">Play Again</button>
            )}
            <Link to="/" className="bg-white text-black font-black uppercase border-[3px] border-black py-3 px-8 rounded shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000]">Exit</Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Opponent Card */}
          <div className="bg-gray-100 border-[4px] border-black shadow-[8px_8px_0px_#000] p-8 text-center flex flex-col items-center justify-center min-h-[300px] rounded-lg rotate-1">
            <h3 className="text-xl font-black uppercase mb-4">{opponent?.name || 'Opponent'}</h3>
            <div className="text-[5rem] mb-4">
              {opponent?.currentChoice ? ICONS[opponent.currentChoice] : '⏳'}
            </div>
            <p className="font-bold text-gray-500 uppercase">{opponent?.currentChoice ? 'Choice Locked' : 'Thinking...'}</p>
          </div>

          {/* Player Card */}
          <div className="bg-white border-[4px] border-black shadow-[8px_8px_0px_#000] p-8 text-center flex flex-col items-center justify-center min-h-[300px] rounded-lg -rotate-1">
             <h3 className="text-xl font-black uppercase mb-4">You ({me?.name})</h3>
             
             {gameState.status === 'round-result' ? (
                <>
                  <div className="text-[5rem] mb-4">{ICONS[me?.currentChoice]}</div>
                  <h3 className="text-2xl font-black text-[#f87171] uppercase mb-4">
                    {gameState.roundWinnerId === 'tie' ? "Round Tie!" : gameState.roundWinnerId === me.id ? "You Won the Round!" : "Opponent Won!"}
                  </h3>
                  {isHost ? (
                     <button onClick={nextRound} className="bg-[#fbbf24] border-[3px] border-black px-6 py-2 shadow-[4px_4px_0px_#000] font-black uppercase mt-4 hover:translate-y-[2px] hover:shadow-[2px_2px_0px_#000]">Start Next Round</button>
                  ) : (
                     <p className="text-sm font-bold text-gray-500 uppercase mt-4">Waiting for host...</p>
                  )}
                </>
             ) : (
                <>
                  <div className="text-[5rem] mb-6">{me?.currentChoice ? ICONS[me.currentChoice] : '🤔'}</div>
                  {!me?.currentChoice ? (
                    <div className="flex gap-4">
                      {['stone', 'paper', 'scissor'].map(choice => (
                        <button key={choice} onClick={() => playMove(choice)} className="bg-gray-200 border-[3px] border-black p-4 text-3xl rounded shadow-[4px_4px_0px_#000] hover:-translate-y-2 hover:bg-[#86efac] transition-all">
                          {ICONS[choice]}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="font-black text-[#86efac] text-xl uppercase tracking-widest bg-black px-4 py-2 rounded">Choice Locked!</p>
                  )}
                </>
             )}
          </div>
        </div>
      )}
    </div>
  );
}