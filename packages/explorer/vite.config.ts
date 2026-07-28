import path from 'node:path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const flatbreadPort = process.env.FLATBREAD_PORT ?? '5057';
const flatbreadTarget = `http://localhost:${flatbreadPort}`;

export default defineConfig({
  plugins: [react()],
  root: '.',
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src/web'),
    },
  },
  build: {
    outDir: 'dist/static',
    emptyOutDir: true,
    sourcemap: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/graphql': {
        target: flatbreadTarget,
        changeOrigin: true,
      },
      '/events': {
        target: flatbreadTarget,
        changeOrigin: true,
      },
    },
  },
});
