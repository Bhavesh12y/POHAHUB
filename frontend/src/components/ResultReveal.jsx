import { useEffect, useState } from 'react';

/**
 * Delays a game-over card so players can see the final move first, and lets
 * them hide the card to study the board.
 */
export function useResultReveal(isOver, delayMs = 1800) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isOver) {
      setVisible(false);
      return undefined;
    }
    const timer = setTimeout(() => setVisible(true), delayMs);
    return () => clearTimeout(timer);
  }, [isOver, delayMs]);

  return { visible, hide: () => setVisible(false), show: () => setVisible(true) };
}

export function ViewBoardButton({ onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-white w-full block py-3 text-sm font-black tracking-widest uppercase border-[3px] border-black shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] text-black transition-all duration-150 rounded"
    >
      View Board
    </button>
  );
}

export function ShowResultChip({ onClick, label = 'Show Result' }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[95] bg-[#facc15] border-[3px] border-black px-6 py-3 font-black uppercase tracking-widest shadow-[5px_5px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all -rotate-1"
    >
      {label}
    </button>
  );
}
