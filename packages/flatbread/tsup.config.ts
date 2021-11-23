// tsup.config.ts
import type { Options } from 'tsup';
export const tsup: Options = {
  splitting: true,
  sourcemap: true,
  clean: true,
  entryPoints: ['src/cli/index.ts', 'src/index.ts', 'src/graphql/server.ts'],
  format: ['esm', 'cjs'],
  target: 'esnext',
  dts: true,
};
