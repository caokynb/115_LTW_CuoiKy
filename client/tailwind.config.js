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
          success: '#10b981',
          sold: '#475569',
          curtain: '#4a0814',
          curtainMid: '#7c1224',
        },
        slate: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
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
