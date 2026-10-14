import { useEffect } from 'react';
import { CloseIcon } from './Icons.jsx';

// Sketch-styled dialog: dimmed backdrop, closes on Escape or a click outside.
export default function Modal({ open, onClose, title, children, className = 'bg-white', tilt = '-rotate-1' }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/40 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="presentation"
    >
      <div
        className="flex min-h-full items-center justify-center p-4"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose?.();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === 'string' ? title : undefined}
          className={`${className} border-[4px] border-black shadow-[8px_8px_0px_#000] p-6 sm:p-8 max-w-sm w-full relative ${tilt} animate-sketch-pop`}
        >
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="absolute top-4 right-4 bg-red-400 text-black border-[3px] border-black w-10 h-10 flex items-center justify-center shadow-[3px_3px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_#000] transition-all"
              aria-label="Close"
            >
              <CloseIcon />
            </button>
          )}
          {title && (
            <h2 className="text-2xl sm:text-3xl font-black uppercase mb-6 tracking-normal text-left pr-12">{title}</h2>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

export function NameModal({ open, onClose, onSave, initialName = '', heading = "Who's Playing?", note }) {
  return (
    <Modal open={open} onClose={onClose} title={heading} className="bg-[#a9def9]" tilt="rotate-1">
      <NameForm initialName={initialName} onSave={onSave} note={note} />
    </Modal>
  );
}

function NameForm({ initialName, onSave, note }) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const value = new FormData(e.currentTarget).get('playerName')?.toString().trim();
        if (value) onSave(value);
      }}
      className="flex flex-col gap-4"
    >
      <p className="font-body font-semibold text-black text-base">
        {note || 'Pick a display name. It shows on scoreboards and in multiplayer rooms.'}
      </p>
      <input
        type="text"
        name="playerName"
        placeholder="Enter name..."
        maxLength={12}
        defaultValue={initialName}
        required
        className="w-full border-[3px] border-black px-4 py-3 font-black uppercase text-lg focus:outline-none focus:shadow-[4px_4px_0_0_#000] transition-shadow"
        autoFocus
      />
      <button
        type="submit"
        className="bg-[#facc15] text-black border-[3px] border-black px-6 py-3 font-black uppercase tracking-widest text-lg shadow-[4px_4px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[2px_2px_0px_#000] transition-all"
      >
        Let&apos;s Go!
      </button>
    </form>
  );
}
