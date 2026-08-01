/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0f172a',       // slate-900 — main background
          surface: '#1e293b',  // slate-800 — card/surface
          border: '#334155',   // slate-700 — borders
          accent: '#6366f1',   // indigo-500 — primary accent
          muted: '#94a3b8',    // slate-400 — muted text
          text: '#f1f5f9',     // slate-100 — primary text
        },
      },
    },
  },
  plugins: [],
};
