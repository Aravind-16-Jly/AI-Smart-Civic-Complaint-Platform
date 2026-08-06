/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dfe9ff',
          200: '#b8cfff',
          300: '#8db0ff',
          400: '#5b8aff',
          500: '#2f6fff',
          600: '#214ee4',
          700: '#1c3faf',
          800: '#1a3482',
          900: '#15264f',
        },
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(255,255,255,0.08), 0 10px 30px rgba(34, 97, 255, 0.25)',
      },
    },
  },
  plugins: [],
};
