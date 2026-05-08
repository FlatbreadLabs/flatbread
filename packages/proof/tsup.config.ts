import type { Options } from 'tsup';

export const tsup: Options = {
  splitting: true,
  sourcemap: true,
  clean: true,
  entryPoints: [
    'src/index.ts',
    'src/run_dag.ts',
    'src/run_dag_supervisor.ts',
    'src/list_models.ts',
  ],
  format: ['esm'],
  target: 'node18',
  dts: true,
  shims: true,
  treeshake: true,
};
