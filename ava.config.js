export default {
  files: ['packages/**/*.test.(j|t)s'],
  extensions: {
    js: true,
    ts: 'module',
  },
  nonSemVerExperiments: {
    configurableModuleFormat: true,
  },
  nodeArguments: ['--loader=ts-node/esm'],
};
