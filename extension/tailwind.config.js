/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/popup/**/*.{html,tsx,ts}',
    './src/content/**/*.{html,tsx,ts}',
    './src/styles/**/*.css'
  ],
  theme: {
    extend: {
      colors: {
        'xhs-red': '#FF2442',
        'xhs-red-dark': '#E02030',
        'xhs-bg': '#F5F5F5'
      }
    }
  },
  plugins: []
}
