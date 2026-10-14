// The four play-mode cards on the home page (vs Bot, Single Player,
// Multiplayer Room, Multiplayer Local), drawn in the notebook sketch style.

const INK = '#111111';

function Dashes() {
  // Little "emphasis" strokes either side of the drawing.
  return (
    <g stroke={INK} strokeWidth="3.5" strokeLinecap="round">
      <path d="M14 30 L22 35" />
      <path d="M11 46 L20 46" />
      <path d="M106 30 L98 35" />
      <path d="M109 46 L100 46" />
    </g>
  );
}

function BotArt() {
  const cells = [
    ['', '', '', '', ''],
    ['', 'r', '', 'y', ''],
    ['y', 'r', 'y', 'r', ''],
    ['r', 'y', 'r', 'y', 'r'],
  ];
  const fill = { r: '#ef4444', y: '#facc15', '': '#1e293b' };
  return (
    <svg viewBox="0 0 120 90" className="w-full h-full" aria-hidden="true">
      <Dashes />
      <rect x="38" y="10" width="44" height="52" rx="4" fill="#2563eb" stroke={INK} strokeWidth="3" />
      {cells.map((row, r) =>
        row.map((c, i) => <circle key={`${r}-${i}`} cx={44 + i * 8} cy={18 + r * 11} r="3.2" fill={fill[c]} stroke={INK} strokeWidth="1" />),
      )}
      <circle cx="33" cy="64" r="11" fill="#ef4444" stroke={INK} strokeWidth="3" />
      <circle cx="30" cy="61" r="3" fill="#fecaca" />
      <circle cx="87" cy="64" r="11" fill="#facc15" stroke={INK} strokeWidth="3" />
      <circle cx="84" cy="61" r="3" fill="#fef9c3" />
    </svg>
  );
}

function SoloArt() {
  return (
    <svg viewBox="0 0 120 90" className="w-full h-full" aria-hidden="true">
      <Dashes />
      <circle cx="60" cy="28" r="14" fill="#7dd3fc" stroke={INK} strokeWidth="3.5" />
      <path d="M36 72 C36 52 84 52 84 72 Z" fill="#7dd3fc" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
    </svg>
  );
}

function RoomArt() {
  return (
    <svg viewBox="0 0 120 90" className="w-full h-full" aria-hidden="true">
      <Dashes />
      <circle cx="37" cy="34" r="9" fill="#facc15" stroke={INK} strokeWidth="3" />
      <path d="M22 70 C22 52 52 52 52 70 Z" fill="#facc15" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="83" cy="34" r="9" fill="#7dd3fc" stroke={INK} strokeWidth="3" />
      <path d="M68 70 C68 52 98 52 98 70 Z" fill="#7dd3fc" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
      <circle cx="60" cy="26" r="12" fill="#f9a8d4" stroke={INK} strokeWidth="3.5" />
      <path d="M38 72 C38 48 82 48 82 72 Z" fill="#f9a8d4" stroke={INK} strokeWidth="3.5" strokeLinejoin="round" />
    </svg>
  );
}

function LocalArt() {
  return (
    <svg viewBox="0 0 120 90" className="w-full h-full" aria-hidden="true">
      <Dashes />
      <path d="M60 30 C60 20 66 16 70 10" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      <path
        d="M34 38 C40 30 80 30 86 38 C94 48 98 70 88 72 C80 74 76 62 70 60 L50 60 C44 62 40 74 32 72 C22 70 26 48 34 38 Z"
        fill="#c4b5fd"
        stroke={INK}
        strokeWidth="3.5"
        strokeLinejoin="round"
      />
      <path d="M41 46 v10 M36 51 h10" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="76" cy="46" r="3" fill={INK} />
      <circle cx="83" cy="52" r="3" fill={INK} />
      <circle cx="71" cy="53" r="3" fill={INK} />
    </svg>
  );
}

export const PLAY_MODES = [
  { id: 'bot', label: 'vs Bot', band: 'bg-[#c4b5fd]', Art: BotArt },
  { id: 'solo', label: 'Single Player', band: 'bg-[#f9a8d4]', Art: SoloArt },
  { id: 'online', label: 'Multiplayer', sub: '(Room)', band: 'bg-[#7dd3fc]', Art: RoomArt },
  { id: 'local', label: 'Multiplayer', sub: '(Local)', band: 'bg-[#c4b5fd]', Art: LocalArt },
];

function Corners() {
  return (
    <>
      <span className="absolute left-3 bottom-3 w-6 h-4 border-l-[3px] border-b-[3px] border-black" aria-hidden="true" />
      <span className="absolute right-3 bottom-3 w-6 h-4 border-r-[3px] border-b-[3px] border-black" aria-hidden="true" />
    </>
  );
}

export default function ModeCards({ value, onChange }) {
  return (
    <div role="tablist" aria-label="Choose how to play" className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
      {PLAY_MODES.map(({ id, label, sub, band, Art }, i) => {
        const active = value === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(id)}
            className={`group relative flex flex-col text-left bg-white border-[4px] border-black transition-all duration-200 ${
              active
                ? '-translate-y-1.5 shadow-[9px_9px_0px_#000] ' + (i % 2 ? 'rotate-1' : '-rotate-1')
                : 'shadow-[5px_5px_0px_#000] hover:-translate-y-1 hover:shadow-[7px_7px_0px_#000]'
            }`}
          >
            <span className={`${band} h-7 sm:h-9 border-b-[4px] border-black`} />
            <span className={`relative flex flex-col items-center px-3 pt-3 pb-8 sm:pb-10 ${active ? 'bg-[#fef9c3]' : ''}`}>
              <span className="w-full max-w-[150px] aspect-[4/3] transition-transform duration-200 group-hover:scale-105">
                <Art />
              </span>
              <span className="mt-1 text-center font-black uppercase leading-tight text-base sm:text-xl">
                {label}
                {sub && <span className="block">{sub}</span>}
              </span>
              <Corners />
            </span>
          </button>
        );
      })}
    </div>
  );
}
