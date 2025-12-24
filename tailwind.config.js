/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      colors: {
        'income-green': '#a7f3d0', // Brighter emerald green
        'spending-red': '#fca5a5', // Brighter coral red
        'primary': '#6366f1', // Vibrant indigo
        'primary-light': '#818cf8',
        'accent': '#f59e0b', // Vibrant amber
      },
    },
  },
  plugins: [],
}

