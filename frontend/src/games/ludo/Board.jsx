// frontend/src/games/ludo/Board.jsx
import React from 'react';
import { useParams } from 'react-router-dom';
import { useSocket } from '../../lib/socket.js';

export default function LudoBoard() {
  const { roomCode } = useParams();
  const { room, emitGameMove, playerId } = useSocket();

  if (!room || !room.gameState) return <div>Loading Ludo Board...</div>;

  const { gameState } = room;
  const isMyTurn = gameState.players[gameState.currentPlayerIndex]?.id === playerId;
  const myPlayer = gameState.players.find(p => p.id === playerId);

  const handleRoll = () => {
    if (isMyTurn && !gameState.hasRolled) {
      emitGameMove(roomCode, { action: 'roll' });
    }
  };

  const handleMoveToken = (tokenId) => {
    if (isMyTurn && gameState.hasRolled) {
      emitGameMove(roomCode, { action: 'move', tokenId });
    }
  };

  return (
    <div className="flex flex-col items-center p-4">
      <h2 className="text-2xl font-bold mb-4">Ludo</h2>
      
      {/* Game Notifications */}
      <div className="bg-white p-4 rounded-lg shadow w-full max-w-lg mb-6">
         <p className="text-lg text-center font-medium text-gray-700">{gameState.message}</p>
         <p className="text-sm text-center mt-2 text-gray-500">
            {gameState.hasRolled ? `Rolled: ${gameState.diceRoll}` : 'Waiting for roll...'}
         </p>
      </div>

      {/* Controls */}
      <div className="mb-8">
        <button 
           onClick={handleRoll}
           disabled={!isMyTurn || gameState.hasRolled}
           className="px-6 py-3 bg-blue-600 text-white rounded font-bold disabled:opacity-50"
        >
          Roll Dice
        </button>
      </div>

      {/* Basic State Dump (Replace with actual CSS/Canvas Board) */}
      <div className="grid grid-cols-2 gap-4 w-full max-w-2xl">
        {gameState.players.map((player) => (
          <div key={player.id} className="p-4 border rounded shadow" style={{ borderColor: player.color }}>
            <h3 className="font-bold text-lg" style={{ color: player.color }}>
              {player.name} {player.id === playerId ? '(You)' : ''}
            </h3>
            <div className="mt-2 flex flex-col gap-2">
              {player.tokens.map((token) => (
                <button
                  key={token.id}
                  onClick={() => handleMoveToken(token.id)}
                  className="px-2 py-1 text-sm bg-gray-100 rounded hover:bg-gray-200 border"
                >
                  Token {token.id}: Pos {token.position === -1 ? 'Base' : token.position === 57 ? 'Finished' : token.position}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}