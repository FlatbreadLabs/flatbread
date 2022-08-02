import { sveltekit } from '@sveltejs/kit/vite';
import { resolve } from 'node:path';
import { defineConfig } from 'vite';

export default defineConfig({
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
});
