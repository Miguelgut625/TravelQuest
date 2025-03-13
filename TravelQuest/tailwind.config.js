/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./App.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./app/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#4CAF50',
        secondary: '#FFA000',
        danger: '#f44336',
        background: '#f5f5f5',
      },
    },
  },
  plugins: [],
  important: 'html',
  corePlugins: {
    preflight: false,
  },
}; 