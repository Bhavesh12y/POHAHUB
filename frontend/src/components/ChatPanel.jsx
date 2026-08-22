import React, { useState, useEffect, useRef } from 'react';

export default function ChatPanel({ messages = [], onSend, disabled = false, className = '' }) {
  const [text, setText] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!text.trim() || disabled) return;
    onSend(text.trim());
    setText('');
  };

  return (
    <div className={`flex flex-col w-full bg-white border-[4px] border-black rounded-xl shadow-[6px_6px_0px_#000] text-black font-sans overflow-hidden ${className || 'h-[420px] lg:h-[540px]'}`}>
      <div className="px-4 py-3 border-b-[3px] border-black font-black tracking-widest text-xs uppercase text-black bg-[#ffd166] flex justify-between items-center shrink-0">
        <span>💬 Room Chat</span>
        <span className="flex items-center gap-1.5 text-[10px] font-black uppercase">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live
        </span>
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto p-3 space-y-2 text-xs sm:text-sm bg-[#fafafa]">
        {messages.length === 0 && (
          <p className="text-gray-400 text-center py-6 font-bold italic text-xs">
            No messages yet. Say hello!
          </p>
        )}
        {messages.map((msg, idx) => (
          <div
            key={msg.id || idx}
            className={`break-words ${
              msg.playerId === 'SYSTEM'
                ? 'text-center my-1.5 bg-[#fef08a] text-black border-[2px] border-black rounded px-2 py-1 shadow-[2px_2px_0px_#000] text-[11px] font-black uppercase'
                : 'bg-white p-2 rounded-lg border border-black/30 shadow-sm'
            }`}
          >
            {msg.playerId !== 'SYSTEM' && (
              <span className="font-black text-black block text-[11px] uppercase tracking-wide">
                {msg.playerName}:
              </span>
            )}
            <span className={msg.playerId === 'SYSTEM' ? 'text-black' : 'text-gray-900 font-bold'}>
              {msg.message}
            </span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-2.5 border-t-[3px] border-black bg-[#f4f4f5] flex gap-2 shrink-0">
        <input
          type="text"
          placeholder={disabled ? "Chat disabled" : "Type a message..."}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={disabled}
          maxLength={150}
          className="flex-1 px-3 py-2 bg-white border-[2px] border-black rounded-lg text-xs font-bold text-black focus:outline-none focus:ring-2 focus:ring-yellow-400 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || !text.trim()}
          className="sketch-button bg-[#facc15] px-4 py-2 text-xs font-black uppercase disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
