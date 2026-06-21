/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#fdfdfd',
        ink: '#111111',
        pastel: {
          yellow: '#fde047',
          pink: '#f9a8d4',
          sky: '#7dd3fc',
          mint: '#86efac',
          peach: '#fecaca',
          lavender: '#c4b5fd',
          orange: '#fdba74',
        },
        hub: {
          bg: '#fdfdfd',
          surface: '#ffffff',
          card: '#ffffff',
          border: '#111111',
          accent: '#fde047',
          accentHover: '#facc15',
          glow: '#fde047',
          text: '#111111',
          muted: '#4b5563',
        },
      },
      fontFamily: {
        sans: ['Architects Daughter', 'cursive'],
        display: ['Architects Daughter', 'cursive'],
        sketch: ['Architects Daughter', 'cursive'],
      },
      boxShadow: {
        sketch: '6px 6px 0 0 #000000',
        'sketch-sm': '4px 4px 0 0 #000000',
        'sketch-lg': '8px 8px 0 0 #000000',
      },
      animation: {
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
