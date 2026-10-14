import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Pure game engines live in the backend and are reused in the browser for
// local and vs-bot play, so both sides always follow identical rules.
const enginesDir = fileURLToPath(new URL('../backend/src/games', import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@engines': enginesDir,
    },
  },
  server: {
    port: 5173,
    fs: {
      allow: ['..'],
    },
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3001',
        ws: true,
      },
    },
  },
});
