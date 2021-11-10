// tsup.config.ts
import type { Options } from 'tsup';
export const tsup: Options = {
  splitting: false,
  sourcemap: true,
  clean: true,
  entryPoints: ['src/*'],
  format: ['esm'],
  target: 'esnext',
  dts: true,
};
