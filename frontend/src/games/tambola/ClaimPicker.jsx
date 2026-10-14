import { useMemo, useState } from 'react';
import { TAMBOLA_CLAIMS, CLAIM_CATEGORIES, CLAIM_PRESETS, sanitizeClaimIds } from '@engines/tambolaClaims.js';

/**
 * Lobby prize picker. The host can toggle any prize, search the list or apply a
 * preset; everyone else sees the chosen prizes read-only.
 */
export default function ClaimPicker({ selected, isHost, onChange }) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selectedSet = new Set(selected);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TAMBOLA_CLAIMS;
    return TAMBOLA_CLAIMS.filter(
      (c) => c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q) || c.category.toLowerCase().includes(q),
    );
  }, [query]);

  const toggle = (id) => {
    if (!isHost || id === 'fullHouse') return;
    const next = selectedSet.has(id) ? selected.filter((x) => x !== id) : [...selected, id];
    onChange(sanitizeClaimIds(next));
  };

  const chosen = TAMBOLA_CLAIMS.filter((c) => selectedSet.has(c.id));

  return (
    <section className="w-full max-w-2xl mx-auto bg-white border-[3px] border-black shadow-[5px_5px_0px_#000] p-4 sm:p-5 text-left">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <h3 className="text-lg font-black uppercase tracking-wider">
          Prizes this game <span className="bg-[#facc15] border-[2px] border-black px-2 py-0.5 text-sm ml-1">{chosen.length}</span>
        </h3>
        {isHost && (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="bg-[#7dd3fc] border-[3px] border-black px-3 py-1.5 text-xs font-black uppercase shadow-[3px_3px_0px_#000] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[1px_1px_0px_#000] transition-all"
          >
            {open ? 'Done' : 'Edit prizes'}
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {chosen.map((c) => (
          <span key={c.id} className="bg-[#fef9c3] border-[2px] border-black px-2 py-1 text-xs font-black uppercase">
            {c.label}
          </span>
        ))}
      </div>
      {!isHost && (
        <p className="font-body text-sm font-semibold text-gray-600 mt-3">The host picks the prizes before starting.</p>
      )}

      {isHost && open && (
        <div className="mt-5 border-t-[3px] border-dashed border-black pt-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs font-black uppercase tracking-widest self-center mr-1">Presets:</span>
            {Object.entries(CLAIM_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                type="button"
                onClick={() => onChange(sanitizeClaimIds(preset.claims))}
                className="bg-white border-[2px] border-black px-2.5 py-1 text-xs font-black uppercase shadow-[2px_2px_0px_#000] hover:bg-[#fde047] transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search prizes (e.g. corner, lunch, early)"
            className="w-full border-[3px] border-black px-3 py-2 font-body font-semibold mb-4 focus:outline-none focus:shadow-[3px_3px_0_0_#000]"
          />

          <div className="max-h-80 overflow-y-auto pr-1 space-y-4">
            {CLAIM_CATEGORIES.map((category) => {
              const items = filtered.filter((c) => c.category === category);
              if (items.length === 0) return null;
              return (
                <div key={category}>
                  <p className="text-xs font-black uppercase tracking-widest text-gray-500 mb-2">{category}</p>
                  <div className="grid sm:grid-cols-2 gap-2">
                    {items.map((c) => {
                      const on = selectedSet.has(c.id);
                      const locked = c.id === 'fullHouse';
                      return (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => toggle(c.id)}
                          aria-pressed={on}
                          disabled={locked}
                          className={`text-left border-[2px] border-black px-3 py-2 transition-all ${
                            on ? 'bg-[#86efac] shadow-[3px_3px_0px_#000]' : 'bg-white hover:bg-gray-50'
                          } ${locked ? 'cursor-not-allowed' : ''}`}
                        >
                          <span className="flex items-center justify-between gap-2">
                            <span className="font-black uppercase text-sm">{c.label}</span>
                            <span className={`text-[10px] font-black uppercase border-[2px] border-black px-1.5 ${on ? 'bg-black text-white' : 'bg-white'}`}>
                              {locked ? 'Always' : on ? 'On' : 'Off'}
                            </span>
                          </span>
                          <span className="block font-body text-xs font-semibold text-gray-700 mt-1">{c.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && <p className="font-body font-semibold text-gray-600">No prize matches that search.</p>}
          </div>
        </div>
      )}
    </section>
  );
}
