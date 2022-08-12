const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        cream: '#FFE8DC',
      },
      fontFamily: {
        dosis: ['Dosis', ...defaultTheme.fontFamily.sans],
      },
    },
  },
  plugins: [],
};
