// tsup.config.ts
import type { Options } from 'tsup';
export const tsup: Options = {
  splitting: false,
  sourcemap: true,
  clean: true,
  entryPoints: ['src/index.ts'],
  format: ['esm', 'cjs'],
  target: 'esnext',
  dts: true,
  shims: true,
  treeshake: true,
  banner: {
    js: `
      import { createRequire } from 'module';
      import { resolve } from 'path';
      
      const require = createRequire(resolve(import.meta.url));`,
  },
};
