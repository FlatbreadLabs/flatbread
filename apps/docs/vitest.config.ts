import { defineConfig } from 'vitest/config';

/**
 * The site's pure logic runs without a browser or GraphQL server. Component
 * tests opt into jsdom in their own files.
 */
export default defineConfig({
  oxc: {
    jsx: { runtime: 'automatic' },
  },
  test: {
    globals: true,
    environment: 'node',
    include: [
      'app/components/nav/**/*.test.tsx',
      'app/components/prose/**/*.test.tsx',
      'app/components/search/**/*.test.tsx',
      'lib/**/*.test.ts',
      'plugins/**/*.test.mjs',
      'plugins/**/*.test.ts',
      'scripts/**/*.test.mjs',
    ],
  },
});
