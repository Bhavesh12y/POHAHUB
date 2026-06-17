import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation, Link } from 'react-router-dom';
import { connectSocket, emitWithAck } from '../../lib/socket.js';

const COLS = 7;
const ROWS = 6;

function Disc({ color, isWinning, animate }) {
  const colorClass =
    color === 'red'
      ? 'bg-gradient-to-br from-red-400 to-red-700 shadow-red-500/40'
      : color === 'yellow'
        ? 'bg-gradient-to-br from-yellow-300 to-yellow-600 shadow-yellow-500/40'
        : 'bg-hub-surface/50';

  return (
    <div
      className={`aspect-square rounded-full transition-all duration-300 shadow-lg ${
        color ? colorClass : 'border border-hub-border/30'
      } ${isWinning ? 'ring-2 ring-white ring-offset-2 ring-offset-hub-bg scale-110' : ''} ${
        animate ? 'animate-drop' : ''
      }`}
    />
  );
}

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
    <div className="glass-card flex flex-col h-full min-h-[280px]">
      <div className="px-4 py-3 border-b border-hub-border font-semibold text-sm">Room Chat</div>
      <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-2 text-sm">
        {messages.length === 0 && (
          <p className="text-hub-muted text-center py-4">No messages yet</p>
        )}
        {messages.map((msg) => (
          <div key={msg.id} className="break-words">
            <span className="font-semibold text-hub-accent">{msg.playerName}: </span>
            <span className="text-hub-text">{msg.message}</span>
          </div>
        ))}
      </div>
      <form onSubmit={handleSubmit} className="p-3 border-t border-hub-border flex gap-2">
        <input
          type="text"
          className="input-field py-2 text-sm flex-1"
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          maxLength={500}
        />
        <button type="submit" className="btn-primary py-2 px-4 text-sm" disabled={disabled}>
          Send
        </button>
      </form>
    </div>
  );
}

export default function ConnectFourBoard() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [room, setRoom] = useState(location.state?.room ?? null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [pendingColumn, setPendingColumn] = useState(null);
  const lastMoveRef = useRef(null);

  const myPlayerId = room?.viewerId;
  const gameState = room?.gameState;
  const isPlaying = room?.status === 'playing';
  const isMyTurn = gameState?.currentPlayerId === myPlayerId;
  const myColor = gameState?.players?.find((p) => p.id === myPlayerId)?.color;
  const isHost = room?.hostId === myPlayerId;

  const winningSet = new Set(
    (gameState?.winningCells ?? []).map(([r, c]) => `${r}-${c}`),
  );

  useEffect(() => {
    const socket = connectSocket();
    const username = sessionStorage.getItem('pohahub_username');

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
        if (
          updatedRoom.gameState?.lastMove &&
          updatedRoom.gameState.lastMove !== lastMoveRef.current
        ) {
          lastMoveRef.current = updatedRoom.gameState.lastMove;
        }
        setRoom(updatedRoom);
      }
    };
    const onChatMessage = (msg) => {
      setRoom((prev) =>
        prev ? { ...prev, chat: [...(prev.chat ?? []), msg] } : prev,
      );
    };
    const onRoomClosed = () => {
      setError('Room was closed');
      setTimeout(() => navigate('/games/connect-four'), 2000);
    };

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('room:update', onRoomUpdate);
    socket.on('chat:message', onChatMessage);
    socket.on('room:closed', onRoomClosed);

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
    };
  }, [roomCode, navigate]);

  const handleStart = async () => {
    setError('');
    const result = await emitWithAck('room:start', {});
    if (!result.ok) {
      setError(result.error);
    }
  };

  const handleDrop = useCallback(
    async (column) => {
      if (!isPlaying || !isMyTurn || pendingColumn !== null) return;

      setPendingColumn(column);
      setError('');

      const result = await emitWithAck('game:move', { column });

      setPendingColumn(null);

      if (!result.ok) {
        setError(result.error);
      }
    },
    [isPlaying, isMyTurn, pendingColumn],
  );

  const handleChat = async (message) => {
    await emitWithAck('chat:message', { message });
  };

  if (!room) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center">
        <div className="glass-card p-10">
          <div className="animate-pulse text-hub-muted mb-2">Connecting to room...</div>
          <p className="text-sm text-hub-muted font-mono">{roomCode}</p>
          {!connected && (
            <p className="text-sm text-amber-400 mt-4">
              Make sure the backend server is running on port 3001
            </p>
          )}
        </div>
      </div>
    );
  }

  const statusMessage = (() => {
    if (room.status === 'waiting') {
      return `Waiting for players (${room.players.length}/${room.maxPlayers})`;
    }
    if (gameState?.status === 'won') {
      const winnerName = gameState.winner?.name ?? 'Someone';
      return `${winnerName} wins!`;
    }
    if (gameState?.status === 'draw') {
      return "It's a draw!";
    }
    if (isMyTurn) {
      return 'Your turn — pick a column';
    }
    const current = gameState?.players?.find((p) => p.id === gameState.currentPlayerId);
    return `${current?.name ?? 'Opponent'}'s turn`;
  })();

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 space-y-6">
          <div className="glass-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
              <div>
                <p className="text-sm text-hub-muted">Room Code</p>
                <p className="text-2xl font-mono font-bold tracking-widest text-hub-accent">
                  {room.code}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-hub-muted">Status</p>
                <p className="font-semibold">{statusMessage}</p>
              </div>
            </div>

            {error && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex flex-wrap gap-3 mb-6">
              {room.players.map((player) => {
                const color = gameState?.players?.find((p) => p.id === player.id)?.color;
                return (
                  <div
                    key={player.id}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full bg-hub-surface border ${
                      player.id === myPlayerId ? 'border-hub-accent' : 'border-hub-border'
                    }`}
                  >
                    {color && (
                      <span
                        className={`w-3 h-3 rounded-full ${
                          color === 'red' ? 'bg-red-500' : 'bg-yellow-400'
                        }`}
                      />
                    )}
                    <span className="text-sm">
                      {player.name}
                      {player.id === room.hostId && ' (host)'}
                      {player.id === myPlayerId && ' (you)'}
                    </span>
                  </div>
                );
              })}
            </div>

            {room.status === 'waiting' && (
              <div className="text-center py-6 border border-dashed border-hub-border rounded-xl mb-6">
                <p className="text-hub-muted mb-4">
                  Share the room code with a friend. Start when both players are here.
                </p>
                {isHost ? (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleStart}
                    disabled={room.players.length < 2}
                  >
                    Start Game
                  </button>
                ) : (
                  <p className="text-sm text-hub-muted">Waiting for host to start...</p>
                )}
              </div>
            )}

            {gameState && (
              <div className="mx-auto max-w-md">
                <div className="grid grid-cols-7 gap-1.5 mb-2">
                  {Array.from({ length: COLS }).map((_, col) => (
                    <button
                      key={col}
                      type="button"
                      className="aspect-square rounded-lg hover:bg-hub-accent/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed text-hub-muted hover:text-hub-accent text-xs font-bold"
                      onClick={() => handleDrop(col)}
                      disabled={
                        !isPlaying ||
                        !isMyTurn ||
                        pendingColumn !== null ||
                        gameState.status !== 'playing'
                      }
                      aria-label={`Drop in column ${col + 1}`}
                    >
                      ▼
                    </button>
                  ))}
                </div>

                <div
                  className="p-3 rounded-2xl bg-gradient-to-b from-blue-700 to-blue-900 shadow-inner"
                  style={{ boxShadow: 'inset 0 4px 20px rgba(0,0,0,0.4)' }}
                >
                  <div className="grid grid-cols-7 gap-1.5">
                    {gameState.board.map((row, rowIndex) =>
                      row.map((cell, colIndex) => {
                        const isLastMove =
                          gameState.lastMove?.row === rowIndex &&
                          gameState.lastMove?.column === colIndex;
                        return (
                          <Disc
                            key={`${rowIndex}-${colIndex}`}
                            color={cell}
                            isWinning={winningSet.has(`${rowIndex}-${colIndex}`)}
                            animate={isLastMove}
                          />
                        );
                      }),
                    )}
                  </div>
                </div>

                {myColor && (
                  <p className="text-center text-sm text-hub-muted mt-4">
                    You are playing as{' '}
                    <span
                      className={`font-semibold ${
                        myColor === 'red' ? 'text-red-400' : 'text-yellow-400'
                      }`}
                    >
                      {myColor}
                    </span>
                  </p>
                )}
              </div>
            )}

            {(gameState?.status === 'won' || gameState?.status === 'draw') && (
              <div className="text-center mt-6">
                <Link to="/games/connect-four" className="btn-secondary inline-block">
                  Back to Lobby
                </Link>
              </div>
            )}
          </div>
        </div>

        <div className="lg:w-80">
          <ChatPanel
            messages={room.chat ?? []}
            onSend={handleChat}
            disabled={!connected}
          />
        </div>
      </div>
    </div>
  );
}
