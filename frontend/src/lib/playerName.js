// Single source of truth for the player's display name.
// Older builds stored it under several keys; we read all of them and write the canonical ones.
const PRIMARY_KEY = 'Doozles-player-name';
const LEGACY_KEYS = ['pohahub_username', 'doozles-player-name'];

function safeGet(storage, key) {
  try {
    return storage?.getItem(key) || '';
  } catch {
    return '';
  }
}

export function getPlayerName() {
  if (typeof window === 'undefined') return '';
  const fromPrimary = safeGet(window.localStorage, PRIMARY_KEY);
  if (fromPrimary) return fromPrimary;
  for (const key of LEGACY_KEYS) {
    const value = safeGet(window.localStorage, key) || safeGet(window.sessionStorage, key);
    if (value) return value;
  }
  return '';
}

export function setPlayerName(name) {
  const clean = (name || '').trim();
  if (!clean || typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PRIMARY_KEY, clean);
    // Multiplayer boards still read this key on reconnect.
    window.localStorage.setItem('pohahub_username', clean);
    window.sessionStorage.setItem('pohahub_username', clean);
  } catch {
    // Storage can be blocked (private mode); the name just won't persist.
  }
}
