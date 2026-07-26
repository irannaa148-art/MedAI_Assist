/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        medical: {
          50: '#f0fafb',
          100: '#dcf3f6',
          200: '#bee5eb',
          300: '#91d1dc',
          400: '#5db3c5',
          500: '#4197a9',
          600: '#397c8f',
          700: '#346676',
          800: '#305562',
          900: '#2c4854',
          950: '#192e38',
        }
      }
    },
  },
  plugins: [],
}
