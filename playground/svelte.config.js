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
    vite: {
      resolve: {
        alias: {
          flatbread: resolve('../packages/flatbread/src/index.ts'),
          '@flatbread/transformer-markdown': resolve(
            '../packages/transformer-markdown/src/index.ts'
          ),
          '@flatbread/source-filesystem': resolve(
            '../packages/source-filesystem/src/index.ts'
          ),
        },
      },
    },
  },

  preprocess: [preprocess({})],
};

export default config;
