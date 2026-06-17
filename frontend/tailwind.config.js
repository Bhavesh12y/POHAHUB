/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        hub: {
          bg: '#0a0e1a',
          surface: '#121829',
          card: '#1a2235',
          border: '#2a3550',
          accent: '#6366f1',
          accentHover: '#818cf8',
          glow: '#a78bfa',
          text: '#e2e8f0',
          muted: '#94a3b8',
        },
      },
      fontFamily: {
        display: ['Segoe UI', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px rgba(99, 102, 241, 0.25)',
        card: '0 8px 32px rgba(0, 0, 0, 0.4)',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        drop: 'drop 0.35s ease-out',
      },
      keyframes: {
        drop: {
          '0%': { transform: 'translateY(-300%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
};
