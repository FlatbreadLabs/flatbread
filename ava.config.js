export default {
  // GraphQL schema generation currently uses graphql-compose's process-global
  // schemaComposer. Run AVA files serially so schema-building tests do not
  // mutate that shared composer concurrently.
  concurrency: 1,
  files: [
    'packages/**/*.test.(j|t)s',
    // Codegen + utils use Vitest under src/__tests__. Keep those out of the
    // root AVA run, but allow AVA-owned proof coverage under the same folder
    // layout so `pnpm test` exercises the proof bounded-loop suite and its
    // parser/runtime guardrails.
    '!packages/codegen/src/__tests__/**',
    '!packages/utils/src/__tests__/**',
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
