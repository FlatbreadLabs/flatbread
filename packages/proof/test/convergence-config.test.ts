import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseDAG } from '../src/dag.ts';
import {
  DEFAULT_MAX_ITERATIONS,
  resolveConvergenceConfig,
} from '../src/convergence_config.ts';

const TEST_DIR = dirname(fileURLToPath(import.meta.url));

function baseDag() {
  return {
    title: 'Convergence config test DAG',
    tasks: [
      {
        id: 'build',
        depends_on: [],
        complexity: 'LOW' as const,
        subtask_prompt: 'Build the thing.',
      },
      {
        id: 'review',
        depends_on: ['build'],
        complexity: 'LOW' as const,
        subtask_prompt: 'Review the thing.',
      },
    ],
  };
}

test('parseDAG accepts DAG-authored convergence config', () => {
  const dag = parseDAG({
    ...baseDag(),
    converge: {
      on: 'review',
      maxIterations: 2,
    },
  });

  assert.deepEqual(dag.converge, {
    on: 'review',
    maxIterations: 2,
  });
});

test('parseDAG rejects non-object convergence config', () => {
  assert.throws(
    () =>
      parseDAG({
        ...baseDag(),
        converge: ['review'],
      }),
    /DAG\.converge must be a JSON object when set\./
  );
});

test('parseDAG rejects convergence config without a valid task id', () => {
  assert.throws(
    () =>
      parseDAG({
        ...baseDag(),
        converge: {
          on: 'missing-review',
        },
      }),
    /DAG\.converge\.on references unknown task id: missing-review/
  );
});

test('parseDAG rejects non-positive convergence maxIterations', () => {
  assert.throws(
    () =>
      parseDAG({
        ...baseDag(),
        converge: {
          on: 'review',
          maxIterations: 0,
        },
      }),
    /DAG\.converge\.maxIterations must be a positive integer when set\./
  );
});

test('resolveConvergenceConfig prefers DAG-authored defaults over runner fallback', () => {
  const dag = parseDAG({
    ...baseDag(),
    converge: {
      on: 'review',
      maxIterations: 4,
    },
  });

  assert.deepEqual(resolveConvergenceConfig(dag), {
    on: 'review',
    maxIterations: 4,
  });
});

test('resolveConvergenceConfig lets CLI flags override target and ceiling independently', () => {
  const dag = parseDAG({
    ...baseDag(),
    converge: {
      on: 'review',
      maxIterations: 4,
    },
  });

  assert.deepEqual(resolveConvergenceConfig(dag, { convergeOn: 'build' }), {
    on: 'build',
    maxIterations: 4,
  });
  assert.deepEqual(resolveConvergenceConfig(dag, { maxIterations: 2 }), {
    on: 'review',
    maxIterations: 2,
  });
});

test('resolveConvergenceConfig falls back to the historical default ceiling', () => {
  const dag = parseDAG(baseDag());

  assert.deepEqual(resolveConvergenceConfig(dag), {
    on: undefined,
    maxIterations: DEFAULT_MAX_ITERATIONS,
  });
});

test('resolveConvergenceConfig preserves legacy CLI-only convergence runs', () => {
  const dag = parseDAG(baseDag());

  assert.deepEqual(
    resolveConvergenceConfig(dag, {
      convergeOn: 'review',
      maxIterations: 2,
    }),
    {
      on: 'review',
      maxIterations: 2,
    }
  );
});

test('resolveConvergenceConfig rejects CLI overrides that target unknown tasks', () => {
  const dag = parseDAG(baseDag());

  assert.throws(
    () => resolveConvergenceConfig(dag, { convergeOn: 'missing-review' }),
    /Convergence target "missing-review" is not a task id in DAG "Convergence config test DAG"/
  );
});

test('the shipped example DAG round-trips its convergence config', async () => {
  const exampleDagPath = resolve(
    TEST_DIR,
    '../../../.cursor/skills/proof/examples/example_dag.json'
  );
  const raw = JSON.parse(await readFile(exampleDagPath, 'utf8'));
  const dag = parseDAG(raw);

  assert.deepEqual(dag.converge, {
    on: 'review',
    maxIterations: 2,
  });
  assert.deepEqual(resolveConvergenceConfig(dag), {
    on: 'review',
    maxIterations: 2,
  });
});
