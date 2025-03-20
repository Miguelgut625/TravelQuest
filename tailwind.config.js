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
        primary: '#005F9E',
        secondary: '#FFFFFF',
        danger: '#D32F2F',
        backgroundGradient: ['#005F9E', '#F0F0F0'],
      },
    },
  },
  plugins: [],
  important: 'html',
  corePlugins: {
    preflight: false,
  },
}; 