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
          50: '#fef2f3',
          100: '#fde6e8',
          200: '#fbd0d5',
          300: '#f7a8b2',
          400: '#f27485',
          500: '#b91c34',
          600: '#881326',
          700: '#6e0f1e',
          800: '#580c18',
          900: '#450913',
          950: '#2a050b',
        },
        cinema: {
          bg: '#0a0a0a',
          card: '#1c1c1c',
          elevated: '#262626',
          border: '#3a3a3a',
          borderSubtle: '#2c2c2c',
          primary: '#881326',
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
