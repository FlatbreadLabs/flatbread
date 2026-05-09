import type { DAG } from './dag.js';

export interface CliConvergenceOverrides {
  convergeOn?: string;
  maxIterations?: number;
}

export interface ResolvedConvergenceConfig {
  on?: string;
  maxIterations: number;
}

/** Matches the historical `--max-iterations` default when DAG JSON omits a ceiling. */
export const DEFAULT_MAX_ITERATIONS = 3;

export function resolveConvergenceConfig(
  dag: DAG,
  overrides: CliConvergenceOverrides = {}
): ResolvedConvergenceConfig {
  const on = overrides.convergeOn ?? dag.converge?.on;
  if (on !== undefined && !dag.tasks.some((task) => task.id === on)) {
    throw new Error(
      `Convergence target "${on}" is not a task id in DAG "${dag.title}"`
    );
  }
  return {
    on,
    maxIterations:
      overrides.maxIterations ??
      dag.converge?.maxIterations ??
      DEFAULT_MAX_ITERATIONS,
  };
}
