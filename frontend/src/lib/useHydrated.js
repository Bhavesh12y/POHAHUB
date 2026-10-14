import { useEffect, useState } from 'react';

// False during server prerender and the first client render, true afterwards.
// Use it for UI that depends on the URL query or browser-only state, so the
// hydrated markup matches the prerendered HTML.
export default function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
