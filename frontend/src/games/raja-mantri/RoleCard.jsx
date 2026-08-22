import React from 'react';

export const ROLES_DATA = {
  RAJA: {
    name: 'Raja',
    title: 'The Royal King',
    points: 1000,
    color: 'bg-gradient-to-b from-[#fef08a] to-[#facc15]',
    accent: '#ca8a04',
    badge: '👑 KING (1000 pts)',
    description: 'Calls for the Minister to find the sneaky thief.',
    renderIllustration: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20 drop-shadow-md">
        {/* Crown */}
        <path d="M25 40 L35 20 L50 32 L65 20 L75 40 L70 45 L30 45 Z" fill="#fbbf24" stroke="#000" strokeWidth="2.5" strokeLinejoin="round" />
        <circle cx="35" cy="18" r="3" fill="#ef4444" stroke="#000" strokeWidth="1" />
        <circle cx="50" cy="30" r="3" fill="#3b82f6" stroke="#000" strokeWidth="1" />
        <circle cx="65" cy="18" r="3" fill="#ef4444" stroke="#000" strokeWidth="1" />
        {/* Face */}
        <circle cx="50" cy="58" r="18" fill="#fed7aa" stroke="#000" strokeWidth="2.5" />
        {/* Royal Mustache */}
        <path d="M40 60 Q50 68 50 62 Q50 68 60 60 Q50 64 40 60" fill="#18181b" stroke="#000" strokeWidth="1.5" />
        {/* Eyes */}
        <circle cx="43" cy="54" r="2" fill="#000" />
        <circle cx="57" cy="54" r="2" fill="#000" />
        {/* Robe Collar */}
        <path d="M30 76 Q50 68 70 76 L80 95 L20 95 Z" fill="#9333ea" stroke="#000" strokeWidth="2.5" />
        {/* Gold Necklace */}
        <path d="M40 76 Q50 86 60 76" fill="none" stroke="#fbbf24" strokeWidth="3" />
        <circle cx="50" cy="83" r="3" fill="#ef4444" stroke="#000" strokeWidth="1" />
      </svg>
    )
  },
  MANTRI: {
    name: 'Mantri',
    title: 'The Wise Minister',
    points: 800,
    color: 'bg-gradient-to-b from-[#bae6fd] to-[#38bdf8]',
    accent: '#0284c7',
    badge: '📜 MINISTER (800 pts)',
    description: 'Interrogates the suspects and catches the Chor.',
    renderIllustration: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20 drop-shadow-md">
        {/* Turban / Pagdi */}
        <ellipse cx="50" cy="38" rx="22" ry="14" fill="#0284c7" stroke="#000" strokeWidth="2.5" />
        <circle cx="50" cy="30" r="4" fill="#f59e0b" stroke="#000" strokeWidth="1" />
        <path d="M50 26 Q54 18 52 12" stroke="#ef4444" strokeWidth="2.5" fill="none" />
        {/* Face */}
        <circle cx="50" cy="56" r="17" fill="#fed7aa" stroke="#000" strokeWidth="2.5" />
        {/* Spectacles / Intelligent eyes */}
        <circle cx="43" cy="53" r="3.5" fill="none" stroke="#000" strokeWidth="1.5" />
        <circle cx="57" cy="53" r="3.5" fill="none" stroke="#000" strokeWidth="1.5" />
        <line x1="46.5" y1="53" x2="53.5" y2="53" stroke="#000" strokeWidth="1.5" />
        {/* Tilak */}
        <line x1="50" y1="44" x2="50" y2="48" stroke="#dc2626" strokeWidth="2" />
        {/* Wise Smile */}
        <path d="M45 63 Q50 67 55 63" fill="none" stroke="#000" strokeWidth="1.5" />
        {/* Robe */}
        <path d="M30 74 Q50 68 70 74 L78 95 L22 95 Z" fill="#f8fafc" stroke="#000" strokeWidth="2.5" />
        {/* Scroll in Hand */}
        <rect x="62" y="70" width="14" height="24" rx="2" fill="#fef08a" stroke="#000" strokeWidth="2" transform="rotate(-15 62 70)" />
      </svg>
    )
  },
  SIPAHI: {
    name: 'Sipahi',
    title: 'The Brave Soldier',
    points: 500,
    color: 'bg-gradient-to-b from-[#bbf7d0] to-[#4ade80]',
    accent: '#16a34a',
    badge: '⚔️ SOLDIER (500 pts)',
    description: 'Guards the palace and proves loyalty if wrongly accused.',
    renderIllustration: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20 drop-shadow-md">
        {/* Helmet */}
        <path d="M30 45 Q50 20 70 45 L72 50 L28 50 Z" fill="#64748b" stroke="#000" strokeWidth="2.5" />
        <line x1="50" y1="22" x2="50" y2="34" stroke="#dc2626" strokeWidth="3" />
        {/* Face */}
        <circle cx="50" cy="58" r="17" fill="#fed7aa" stroke="#000" strokeWidth="2.5" />
        {/* Eyes */}
        <circle cx="43" cy="55" r="2" fill="#000" />
        <circle cx="57" cy="55" r="2" fill="#000" />
        {/* Determined mouth */}
        <line x1="45" y1="65" x2="55" y2="65" stroke="#000" strokeWidth="2" />
        {/* Armor Body */}
        <path d="M30 76 Q50 70 70 76 L78 95 L22 95 Z" fill="#475569" stroke="#000" strokeWidth="2.5" />
        {/* Shield */}
        <path d="M64 68 Q78 68 78 82 Q78 94 64 98 Q50 94 50 82 Q50 68 64 68 Z" fill="#eab308" stroke="#000" strokeWidth="2" />
        <path d="M64 74 L64 92 M56 82 L72 82" stroke="#000" strokeWidth="1.5" />
      </svg>
    )
  },
  CHOR: {
    name: 'Chor',
    title: 'The Cunning Thief',
    points: 0,
    color: 'bg-gradient-to-b from-[#fca5a5] to-[#f87171]',
    accent: '#dc2626',
    badge: '🦹 THIEF (0 pts / Steals 800)',
    description: 'Bluffs to mislead the Mantri and steal their 800 points!',
    renderIllustration: () => (
      <svg viewBox="0 0 100 100" className="w-20 h-20 drop-shadow-md">
        {/* Beanie Hat */}
        <path d="M32 45 Q50 25 68 45 Z" fill="#18181b" stroke="#000" strokeWidth="2.5" />
        {/* Face */}
        <circle cx="50" cy="58" r="17" fill="#fed7aa" stroke="#000" strokeWidth="2.5" />
        {/* Burglar Eye Mask */}
        <path d="M34 52 Q50 56 66 52 L66 58 Q50 62 34 58 Z" fill="#18181b" stroke="#000" strokeWidth="1.5" />
        <circle cx="43" cy="55" r="1.5" fill="#fff" />
        <circle cx="57" cy="55" r="1.5" fill="#fff" />
        {/* Mischievous Grin */}
        <path d="M44 65 Q52 70 58 64" fill="none" stroke="#000" strokeWidth="2" />
        {/* Striped Prisoner Shirt */}
        <path d="M28 76 Q50 70 72 76 L78 95 L22 95 Z" fill="#ffffff" stroke="#000" strokeWidth="2.5" />
        <line x1="25" y1="82" x2="75" y2="82" stroke="#000" strokeWidth="3" />
        <line x1="23" y1="89" x2="77" y2="89" stroke="#000" strokeWidth="3" />
        {/* Money Loot Bag */}
        <circle cx="74" cy="80" r="9" fill="#d97706" stroke="#000" strokeWidth="2" />
        <text x="71" y="84" fontSize="9" fontWeight="900" fill="#000">$</text>
      </svg>
    )
  }
};

export default function RoleCard({ roleKey, isRevealed = false }) {
  const role = ROLES_DATA[roleKey];

  if (!isRevealed || !role) {
    return (
      <div className="w-full h-full min-h-[160px] flex flex-col items-center justify-center p-3 rounded-xl border-[3px] border-black bg-amber-50 shadow-inner relative overflow-hidden">
        {/* Parchment texture lines */}
        <div className="absolute inset-0 bg-[radial-gradient(#d97706_1px,transparent_1px)] [background-size:12px_12px] opacity-20" />
        <div className="w-14 h-18 bg-[#fed7aa] border-[2px] border-black rounded shadow-[2px_2px_0px_#000] flex items-center justify-center -rotate-3 mb-2">
          <span className="font-black text-xl text-amber-900">👑</span>
        </div>
        <span className="text-xs font-black uppercase text-amber-900 bg-amber-200 px-2 py-0.5 rounded border border-amber-400">
          Secret Royal Chit
        </span>
      </div>
    );
  }

  return (
    <div className={`w-full h-full min-h-[160px] flex flex-col items-center justify-center p-3 rounded-xl border-[3px] border-black ${role.color} shadow-[3px_3px_0px_#000] text-center transition-all animate-fadeIn`}>
      <div className="mb-1">{role.renderIllustration()}</div>
      <span className="text-lg font-black uppercase text-black tracking-wider leading-none">
        {role.name}
      </span>
      <span className="text-[11px] font-black text-black/80 bg-white/70 px-2 py-0.5 rounded-full border border-black/30 mt-1">
        +{role.points} pts
      </span>
    </div>
  );
}
