const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
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
