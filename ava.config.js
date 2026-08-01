export default {
  // AVA isolates test files in worker processes. Test writers use unique
  // mkdtemp directories (including the cwd-relative watcher fixtures), bind
  // ephemeral ports, and close their servers; no test changes process.cwd().
  // Four workers provide parallelism without over-subscribing real filesystem
  // watchers during the suite's integration tests.
  concurrency: 4,
  files: [
    'packages/**/*.test.(j|t)s',
    'scripts/**/*.test.(j|t)s',
    // Codegen + utils use Vitest under src/__tests__. Keep those out of the
    // root AVA run so `pnpm test` only exercises AVA-owned package and root
    // script coverage.
    '!packages/codegen/src/__tests__/**',
    '!packages/utils/src/__tests__/**',
    // Explorer SPA uses Node's built-in test runner (see package scripts).
    '!packages/explorer/**',
  ],
  extensions: {
    js: true,
    ts: 'module',
  },
  nodeArguments: [
    '--loader=ts-node/esm',
    '--experimental-specifier-resolution=node',
  ],
};
