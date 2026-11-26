/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        sand: '#F3EEE4',
        paper: '#FFFCF7',
        ink: '#172028',
        muted: '#5C6B73',
        line: '#E3D8C8',
        green: {
          DEFAULT: '#0C6B4D',
          dark: '#084736',
          deep: '#06261D',
          soft: '#E4F3EC',
        },
        gold: {
          DEFAULT: '#C8922A',
          soft: '#F8EED6',
        },
        clay: {
          DEFAULT: '#C24E2C',
          soft: '#F8E6DF',
        },
      },
      fontFamily: {
        sans: ['Figtree', 'Segoe UI', 'sans-serif'],
        display: ['Fraunces', 'Georgia', 'serif'],
      },
      boxShadow: {
        card: '0 16px 40px rgba(23, 32, 40, 0.06)',
      },
    },
  },
  plugins: [],
};
