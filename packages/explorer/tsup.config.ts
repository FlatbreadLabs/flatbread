import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/node/index.ts'],
  outDir: 'dist/node',
  format: ['esm'],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  treeshake: true,
  tsconfig: 'tsconfig.node.json',
  external: ['@flatbread/effort-graph', 'node:path', 'node:url'],
});
