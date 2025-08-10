export default {
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
