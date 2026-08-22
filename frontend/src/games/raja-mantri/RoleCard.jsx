import React from 'react';

export const ROLES_DATA = {
  RAJA: {
    name: 'Raja',
    title: 'The King',
    points: 1000,
    color: 'bg-[#facc15]',
    accent: '#ca8a04',
    badge: 'KING (1000 pts)',
    description: 'Calls for the Minister to find the thief.',
    renderIllustration: () => (
      <svg viewBox="0 0 100 100" className="w-12 sm:w-14 h-12 sm:h-14">
        {/* Crown */}
        <path d="M25 38 L35 20 L50 30 L65 20 L75 38 L70 43 L30 43 Z" fill="#fbbf24" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="35" cy="18" r="2.5" fill="#ef4444" stroke="#000" strokeWidth="1" />
        <circle cx="50" cy="28" r="2.5" fill="#3b82f6" stroke="#000" strokeWidth="1" />
        <circle cx="65" cy="18" r="2.5" fill="#ef4444" stroke="#000" strokeWidth="1" />
        {/* Face */}
        <circle cx="50" cy="56" r="16" fill="#fed7aa" stroke="#000" strokeWidth="2.5" />
        {/* Royal Mustache */}
        <path d="M40 58 Q50 64 50 60 Q50 64 60 58 Q50 62 40 58" fill="#18181b" stroke="#000" strokeWidth="1.5" />
        {/* Eyes */}
        <circle cx="44" cy="52" r="2" fill="#000" />
        <circle cx="56" cy="52" r="2" fill="#000" />
        {/* Robe */}
        <path d="M32 72 Q50 66 68 72 L76 92 L24 92 Z" fill="#9333ea" stroke="#000" strokeWidth="2.5" />
        {/* Gold Necklace */}
        <path d="M42 72 Q50 80 58 72" fill="none" stroke="#fbbf24" strokeWidth="2.5" />
      </svg>
    )
  },
  MANTRI: {
    name: 'Mantri',
    title: 'The Minister',
    points: 800,
    color: 'bg-[#38bdf8]',
    accent: '#0284c7',
    badge: 'MINISTER (800 pts)',
    description: 'Interrogates suspects and catches the Chor.',
    renderIllustration: () => (
      <svg viewBox="0 0 100 100" className="w-12 sm:w-14 h-12 sm:h-14">
        {/* Turban / Pagdi */}
        <ellipse cx="50" cy="36" rx="20" ry="12" fill="#0284c7" stroke="#000" strokeWidth="2.5" />
        <circle cx="50" cy="28" r="3.5" fill="#f59e0b" stroke="#000" strokeWidth="1" />
        <path d="M50 25 Q54 18 52 12" stroke="#ef4444" strokeWidth="2.5" fill="none" />
        {/* Face */}
        <circle cx="50" cy="54" r="15" fill="#fed7aa" stroke="#000" strokeWidth="2.5" />
        {/* Spectacles */}
        <circle cx="44" cy="51" r="3" fill="none" stroke="#000" strokeWidth="1.5" />
        <circle cx="56" cy="51" r="3" fill="none" stroke="#000" strokeWidth="1.5" />
        <line x1="47" y1="51" x2="53" y2="51" stroke="#000" strokeWidth="1.5" />
        {/* Tilak */}
        <line x1="50" y1="43" x2="50" y2="47" stroke="#dc2626" strokeWidth="2" />
        {/* Smile */}
        <path d="M46 60 Q50 64 54 60" fill="none" stroke="#000" strokeWidth="1.5" />
        {/* Robe */}
        <path d="M32 70 Q50 66 68 70 L76 92 L24 92 Z" fill="#f8fafc" stroke="#000" strokeWidth="2.5" />
        {/* Scroll in Hand */}
        <rect x="60" y="68" width="12" height="20" rx="2" fill="#fef08a" stroke="#000" strokeWidth="1.5" transform="rotate(-15 60 68)" />
      </svg>
    )
  },
  SIPAHI: {
    name: 'Sipahi',
    title: 'The Soldier',
    points: 500,
    color: 'bg-[#4ade80]',
    accent: '#16a34a',
    badge: 'SOLDIER (500 pts)',
    description: 'Guards the palace.',
    renderIllustration: () => (
      <svg viewBox="0 0 100 100" className="w-12 sm:w-14 h-12 sm:h-14">
        {/* Helmet */}
        <path d="M32 42 Q50 20 68 42 L70 46 L30 46 Z" fill="#64748b" stroke="#000" strokeWidth="2.5" />
        <line x1="50" y1="20" x2="50" y2="30" stroke="#dc2626" strokeWidth="2.5" />
        {/* Face */}
        <circle cx="50" cy="56" r="15" fill="#fed7aa" stroke="#000" strokeWidth="2.5" />
        {/* Eyes */}
        <circle cx="44" cy="53" r="2" fill="#000" />
        <circle cx="56" cy="53" r="2" fill="#000" />
        {/* Mouth */}
        <line x1="46" y1="62" x2="54" y2="62" stroke="#000" strokeWidth="1.5" />
        {/* Armor Body */}
        <path d="M32 72 Q50 66 68 72 L76 92 L24 92 Z" fill="#475569" stroke="#000" strokeWidth="2.5" />
        {/* Shield */}
        <path d="M62 66 Q74 66 74 78 Q74 88 62 92 Q50 88 50 78 Q50 66 62 66 Z" fill="#eab308" stroke="#000" strokeWidth="2" />
      </svg>
    )
  },
  CHOR: {
    name: 'Chor',
    title: 'The Thief',
    points: 0,
    color: 'bg-[#f87171]',
    accent: '#dc2626',
    badge: 'THIEF (0 pts)',
    description: 'Steals the Mantri points if undetected.',
    renderIllustration: () => (
      <svg viewBox="0 0 100 100" className="w-12 sm:w-14 h-12 sm:h-14">
        {/* Beanie Hat */}
        <path d="M34 42 Q50 24 66 42 Z" fill="#18181b" stroke="#000" strokeWidth="2.5" />
        {/* Face */}
        <circle cx="50" cy="56" r="15" fill="#fed7aa" stroke="#000" strokeWidth="2.5" />
        {/* Burglar Mask */}
        <path d="M36 50 Q50 54 64 50 L64 56 Q50 60 36 56 Z" fill="#18181b" stroke="#000" strokeWidth="1.5" />
        <circle cx="44" cy="53" r="1.5" fill="#fff" />
        <circle cx="56" cy="53" r="1.5" fill="#fff" />
        {/* Mouth */}
        <path d="M46 62 Q52 66 56 61" fill="none" stroke="#000" strokeWidth="1.5" />
        {/* Striped Shirt */}
        <path d="M30 72 Q50 66 70 72 L76 92 L24 92 Z" fill="#ffffff" stroke="#000" strokeWidth="2.5" />
        <line x1="27" y1="78" x2="73" y2="78" stroke="#000" strokeWidth="2.5" />
        <line x1="25" y1="85" x2="75" y2="85" stroke="#000" strokeWidth="2.5" />
      </svg>
    )
  }
};

export default function RoleCard({ roleKey, isRevealed = false }) {
  const role = ROLES_DATA[roleKey];

  if (!isRevealed || !role) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center p-2 rounded-xl border-[3px] border-black bg-amber-50 shadow-inner relative overflow-hidden text-center">
        <div className="w-8 h-10 bg-[#fed7aa] border-[2px] border-black rounded shadow-[2px_2px_0px_#000] flex items-center justify-center -rotate-3 mb-1">
          <span className="font-black text-[10px] text-amber-950">CHIT</span>
        </div>
        <span className="text-[10px] font-black uppercase text-amber-950 bg-amber-200 px-1.5 py-0.5 rounded border border-amber-400 leading-tight">
          Secret Chit
        </span>
      </div>
    );
  }

  return (
    <div className={`w-full h-full flex flex-col items-center justify-center p-2 rounded-xl border-[3px] border-black ${role.color} shadow-[3px_3px_0px_#000] text-center transition-all animate-fadeIn`}>
      <div className="mb-0.5 flex items-center justify-center">{role.renderIllustration()}</div>
      <span className="text-xs sm:text-sm font-black uppercase text-black tracking-wider leading-none">
        {role.name}
      </span>
      <span className="text-[9px] sm:text-[10px] font-black text-black/90 bg-white/80 px-1.5 py-0.5 rounded-full border border-black/30 mt-1">
        +{role.points} pts
      </span>
    </div>
  );
}
