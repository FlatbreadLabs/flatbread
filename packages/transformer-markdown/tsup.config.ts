// tsup.config.ts
import { defineConfig } from 'tsup';
export default defineConfig({
  splitting: false,
  sourcemap: true,
  clean: true,
  entryPoints: ['src/*'],
  format: ['esm'],
  target: 'esnext',
  dts: true,
  shims: true,
  
});
