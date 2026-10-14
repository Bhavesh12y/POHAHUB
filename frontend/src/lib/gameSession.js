import { createContext, useContext } from 'react';

// Present only when a multiplayer board is running in local or vs-bot mode.
// Shape: { mode: 'local' | 'bot', roomCode, playerName, label, exitPath }
export const GameSessionContext = createContext(null);

export function useGameSession() {
  return useContext(GameSessionContext);
}
