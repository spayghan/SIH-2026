/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        govblue: '#1e3a8a',
        govdark: '#0f172a',
        govbg: '#f1f5f9'
      }
    },
  },
  plugins: [],
}
