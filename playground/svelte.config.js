import preprocess from 'svelte-preprocess';
// import preprocess from 'svelte-preprocess';
import adapter from '@sveltejs/adapter-static';
import { resolve } from 'path';
// import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte'],

  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  // preprocess: [preprocess()],

  kit: {
    // hydrate the <div id="svelte"> element in src/app.html
    target: '#svelte',
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
      // define: {
      //   __OYU_GQL_HOST__: ['http://localhost:1738'],
      // },
      // plugins: [
      //   (function startingPlugin() {
      //     return {
      //       name: 'starty',
      //       buildStart() {
      //         process.env.HELLOOO = 'world';
      //         console.log('hello world');
      //         // do something with this list
      //       },
      //     };
      //   })(),
      //   (function endingPlugin() {
      //     return {
      //       name: 'endy',
      //       buildStart() {
      //         console.log(process.env.HELLOOO + ' is ending');
      //         // do something with this list
      //       },
      //     };
      //   })(),
      // ],
    },
  },

  preprocess: [preprocess({})],
};

export default config;
