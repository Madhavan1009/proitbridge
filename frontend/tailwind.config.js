/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sidebar: '#071633', // Navy 950 — matches logo background
        navy: {
          950: '#071633',
          900: '#0b1d3f',
          800: '#0f2552',
        },
        // Primary brand = Blue 600 (the starred swatch in the company palette).
        brand: {
          DEFAULT: '#046bd2', // Blue 600 ★
          dark: '#045cb4',    // Blue 700
          light: '#22d3ee',   // Cyan 500 ★
          lighter: '#d9f8fd', // Cyan 100
        },
        // Convenience aliases used in charts and badges.
        cyan: {
          500: '#22d3ee',
          100: '#d9f8fd',
        },
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        'soft-pulse': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(4, 107, 210, 0.55)' },
          '50%': { boxShadow: '0 0 0 10px rgba(4, 107, 210, 0)' },
        },
        'subtle-rise': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'soft-pulse': 'soft-pulse 1.6s ease-in-out infinite',
        'subtle-rise': 'subtle-rise 0.5s ease-out both',
      },
      backgroundImage: {
        'navy-gradient': 'linear-gradient(135deg, #071633 0%, #0b1d3f 50%, #045cb4 100%)',
        'brand-gradient': 'linear-gradient(135deg, #046bd2 0%, #22d3ee 100%)',
      },
    },
  },
  plugins: [],
};
