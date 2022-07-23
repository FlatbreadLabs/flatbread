// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { resolve } from 'path';

/** @type {import('vite').UserConfig} */
const config = {
  plugins: [sveltekit()],
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
};

export default config;
