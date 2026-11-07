/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{js,jsx}",
    "./components/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        "blush-bg": "#fff3f6",
        "blush-bg-deep": "#ffe4ec",
        "rose-text": "#000000",
        "petal-light": "#ffd1dc",
        "petal-mid": "#f472b6",
        "petal-deep": "#db2777",
      },
      fontFamily: {
        display: ["Quicksand", "system-ui", "sans-serif"],
        inter: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
