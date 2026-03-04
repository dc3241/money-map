/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'sans-serif'],
        serif: ['DM Serif Display', 'serif'],
      },
      colors: {
        'bg-app': '#080D18',
        'surface-1': '#0F1524',
        'surface-2': '#141B2E',
        'surface-3': '#1A2238',
        'border-subtle': 'rgba(255,255,255,0.07)',
        'border-hover': 'rgba(255,255,255,0.14)',
        'text-primary': '#F0F4FF',
        'text-secondary': '#8B95B0',
        'text-muted': '#4A5270',
        'accent': '#4F7FFF',
        'accent-glow': 'rgba(79,127,255,0.15)',
        'income-green': '#34C98A',
        'income-green-dim': 'rgba(52,201,138,0.12)',
        'spending-red': '#FF5A5A',
        'spending-red-dim': 'rgba(255,90,90,0.10)',
        'amber': '#F5A623',
        'purple-soft': '#A78BFA',
        'teal-soft': '#2DD4BF',
      },
    },
  },
  plugins: [],
}

