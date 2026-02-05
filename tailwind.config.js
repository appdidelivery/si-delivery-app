// tailwind.config.js (Copie e cole este código inteiro)

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  // ESTA PARTE É A SOLUÇÃO
  safelist: [
    {
      pattern: /(bg|text|border)-\[(#|rgb).+\]/,
    }
  ],
  theme: {
    extend: {},
  },
  plugins: [],
}