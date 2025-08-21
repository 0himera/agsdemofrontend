/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#0ea5e9',
        },
      },
      boxShadow: {
        glass: '0 8px 30px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [],
}
