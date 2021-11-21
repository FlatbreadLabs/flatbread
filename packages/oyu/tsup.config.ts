// tsup.config.ts
import type { Options } from 'tsup';
export const tsup: Options = {
  splitting: false,
  sourcemap: true,
  clean: true,
  entryPoints: ['src/cli/index.ts', 'src/index.ts'],
  format: ['esm'],
  target: 'esnext',
  dts: true,
};
