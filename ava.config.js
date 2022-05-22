export default {
  files: ['packages/**/*.test.(j|t)s'],
  extensions: {
    js: true,
    ts: 'module',
  },
  nodeArguments: ['--loader=ts-node/esm'],
};
