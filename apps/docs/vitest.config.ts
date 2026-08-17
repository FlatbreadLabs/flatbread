import { defineConfig } from 'vitest/config';

/**
 * The site's pure logic — the link rewriter, the contents list, the search
 * ranking, and the page checker — runs without a browser or a GraphQL server,
 * so these tests need nothing but Node.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'lib/**/*.test.ts',
      'plugins/**/*.test.mjs',
      'plugins/**/*.test.ts',
      'scripts/**/*.test.mjs',
    ],
  },
});
