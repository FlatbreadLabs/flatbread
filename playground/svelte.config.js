import preprocess from 'svelte-preprocess';
// import preprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-auto';
import { resolve } from 'path';
// import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte'],

  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  // preprocess: [preprocess()],

  kit: {
    adapter: adapter(),
  },

  preprocess: [preprocess({})],
};

export default config;
