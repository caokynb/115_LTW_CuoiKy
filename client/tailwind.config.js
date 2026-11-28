/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          '"Segoe UI"',
          'Roboto',
          'sans-serif',
        ],
      },
      colors: {
        brand: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
          950: '#4c0519',
        },
        cinema: {
          bg: '#020617',
          card: '#0f172a',
          elevated: '#1e293b',
          border: '#334155',
          borderSubtle: '#1e293b',
          primary: '#e11d48',
          vip: '#f59e0b',
          success: '#047857',
          sold: '#404040',
          curtain: '#4a0814',
          curtainMid: '#7c1224',
        },
        slate: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#3a3a3a',
          800: '#262626',
          900: '#1c1c1c',
          950: '#0a0a0a',
        },
      },
      boxShadow: {
        'cinema-card': '0 12px 32px -12px rgba(0, 0, 0, 0.72)',
        'cinema-cta':
          '0 8px 22px -6px rgba(136, 19, 38, 0.52), inset 0 1px 0 rgba(255, 255, 255, 0.18)',
        'cinema-vip':
          '0 8px 20px -6px rgba(245, 158, 11, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.28)',
        'cinema-surface':
          '0 1px 2px rgba(0, 0, 0, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
      },
    },
  },
  plugins: [],
};
