import preprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte'],
  preprocess: [preprocess({})],

  kit: {
    adapter: adapter(),
    prerender: {
      default: true,
    },
  },
};

export default config;
