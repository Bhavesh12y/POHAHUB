import React, { useState, useEffect } from 'react';
import socket from '../lib/socket'; // Adjust path if necessary

// You can mix native emojis and URLs to custom images from your /public folder
const STICKERS = [
  { id: 'laugh', type: 'emoji', content: '😂' },
  { id: 'cry', type: 'emoji', content: '😭' },
  { id: 'angry', type: 'emoji', content: '😡' },
  { id: 'fire', type: 'emoji', content: '🔥' },
  { id: 'gg', type: 'emoji', content: '🎮' },
  // Example of a custom image sticker:
  // { id: 'custom1', type: 'image', content: '/stickers/pepe-happy.png' }
];

// --- 1. The Picker Menu ---
export function StickerPicker({ roomId }) {
  const [isOpen, setIsOpen] = useState(false);

  const handleSend = (sticker) => {
    socket.emit('sendSticker', { roomId, sticker });
    setIsOpen(false);
  };

  return (
    <div className="relative z-50">
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 bg-gray-800 border-2 border-gray-600 rounded-full flex items-center justify-center hover:bg-gray-700 hover:scale-110 transition-all shadow-lg"
      >
        <span className="text-2xl">😀</span>
      </button>

      {/* Popover Menu */}
      {isOpen && (
        <div className="absolute bottom-[110%] right-0 mb-2 p-3 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl flex flex-wrap gap-3 w-64 origin-bottom-right animate-in fade-in zoom-in duration-200">
          {STICKERS.map((s) => (
            <button
              key={s.id}
              onClick={() => handleSend(s)}
              className="w-10 h-10 flex items-center justify-center text-3xl hover:scale-125 transition-transform hover:bg-gray-800 rounded-lg"
            >
              {s.type === 'emoji' ? s.content : <img src={s.content} alt={s.id} className="w-full h-full object-contain" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// --- 2. The Display Overlay ---
export function StickerOverlay() {
  const [activeStickers, setActiveStickers] = useState([]);

  useEffect(() => {
    const handleReceiveSticker = ({ sticker, id }) => {
      // Add random X position so they don't stack directly on top of each other
      const newSticker = {
        ...sticker,
        uniqueId: Date.now() + Math.random(),
        xPosition: Math.floor(Math.random() * 60) + 20, // Random percentage between 20% and 80%
      };
      
      setActiveStickers((prev) => [...prev, newSticker]);

      // Remove sticker after animation finishes (3 seconds)
      setTimeout(() => {
        setActiveStickers((prev) => prev.filter((s) => s.uniqueId !== newSticker.uniqueId));
      }, 3000);
    };

    socket.on('receiveSticker', handleReceiveSticker);
    return () => socket.off('receiveSticker', handleReceiveSticker);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {activeStickers.map((s) => (
        <div
          key={s.uniqueId}
          className="absolute bottom-[10%] animate-float-up drop-shadow-2xl"
          style={{ left: `${s.xPosition}%` }}
        >
          {s.type === 'emoji' ? (
            <span className="text-7xl">{s.content}</span>
          ) : (
            <img src={s.content} alt="sticker" className="w-24 h-24 object-contain" />
          )}
        </div>
      ))}
    </div>
  );
}