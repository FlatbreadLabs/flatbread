export default {
  // GraphQL schema generation currently uses graphql-compose's process-global
  // schemaComposer. Run AVA files serially so schema-building tests do not
  // mutate that shared composer concurrently.
  concurrency: 1,
  files: [
    'packages/**/*.test.(j|t)s',
    // Exclude Vitest suites located under __tests__ so AVA doesn't try to run them
    '!packages/**/src/__tests__/**',
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
