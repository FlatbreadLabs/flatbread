import preprocess from 'svelte-preprocess';
import { mdsvex, mdsvexExtensions } from './src/lib/mdsvex.js';
import adapter from '@sveltejs/adapter-static';
// import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  extensions: ['.svelte', ...mdsvexExtensions],

  // Consult https://github.com/sveltejs/svelte-preprocess
  // for more information about preprocessors
  preprocess: [preprocess(), mdsvex],

  kit: {
    // hydrate the <div id="svelte"> element in src/app.html
    target: '#svelte',
    adapter: adapter(),
    vite: {
      define: {
        __OYU_GQL_HOST__: ['http://localhost:1738'],
      },
      plugins: [
        (function startingPlugin() {
          return {
            name: 'starty',
            buildStart() {
              process.env.HELLOOO = 'world';
              console.log('hello world');
              // do something with this list
            },
          };
        })(),
        (function endingPlugin() {
          return {
            name: 'endy',
            buildStart() {
              console.log(process.env.HELLOOO + ' is ending');
              // do something with this list
            },
          };
        })(),
      ],
    },
  },
};

export default config;
