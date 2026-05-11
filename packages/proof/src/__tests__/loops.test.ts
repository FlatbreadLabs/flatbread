import test from 'ava';
import {
  parseDAG,
  resolveConvergenceLoops,
  type DAG,
  type DAGConvergenceLoop,
  type RawTask,
} from '../index.js';
import { resolveLoopReexecuteIds } from '../converge_loop.js';

const baseTasks: RawTask[] = [
  {
    id: 'research',
    depends_on: [],
    complexity: 'LOW',
    subtask_prompt: 'research',
    kind: 'task',
  },
  {
    id: 'design',
    depends_on: ['research'],
    complexity: 'MED',
    subtask_prompt: 'design',
    kind: 'task',
  },
  {
    id: 'implement',
    depends_on: ['design'],
    complexity: 'MED',
    subtask_prompt: 'implement',
    kind: 'task',
  },
  {
    id: 'review',
    depends_on: ['implement'],
    complexity: 'HIGH',
    subtask_prompt: 'review',
    kind: 'task',
  },
];

function dagWith(loops: unknown): unknown {
  return {
    title: 'loop-tests',
    tasks: baseTasks.map((t) => ({
      id: t.id,
      depends_on: t.depends_on,
      complexity: t.complexity,
      subtask_prompt: t.subtask_prompt,
    })),
    loops,
  };
}

test('parseDAG accepts a minimal loops entry with defaults', (t) => {
  const dag = parseDAG(dagWith([{ convergeOn: 'review', maxIterations: 2 }]));
  t.truthy(dag.loops);
  t.is(dag.loops!.length, 1);
  t.is(dag.loops![0].convergeOn, 'review');
  t.is(dag.loops![0].maxIterations, 2);
});

test('resolveConvergenceLoops fills defaults', (t) => {
  const resolved = resolveConvergenceLoops([
    { convergeOn: 'review', maxIterations: 2 },
  ]);
  t.is(resolved[0].id, 'loop-review');
  t.deepEqual(resolved[0].reexecute, { kind: 'ancestors' });
});

test('parseDAG rejects convergeOn referencing unknown task id', (t) => {
  t.throws(
    () => parseDAG(dagWith([{ convergeOn: 'nope', maxIterations: 2 }])),
    { message: /not a task id/ }
  );
});

test('parseDAG rejects non-positive maxIterations', (t) => {
  t.throws(
    () => parseDAG(dagWith([{ convergeOn: 'review', maxIterations: 0 }])),
    { message: /maxIterations must be a positive integer/ }
  );
  t.throws(
    () => parseDAG(dagWith([{ convergeOn: 'review', maxIterations: -1 }])),
    { message: /maxIterations must be a positive integer/ }
  );
  t.throws(
    () => parseDAG(dagWith([{ convergeOn: 'review', maxIterations: 1.5 }])),
    { message: /maxIterations must be a positive integer/ }
  );
});

test('parseDAG rejects two loops with the same convergeOn', (t) => {
  t.throws(
    () =>
      parseDAG(
        dagWith([
          { convergeOn: 'review', maxIterations: 2 },
          { convergeOn: 'review', maxIterations: 3 },
        ])
      ),
    { message: /duplicate convergeOn/ }
  );
});

test('parseDAG rejects two loops with the same explicit id', (t) => {
  t.throws(
    () =>
      parseDAG(
        dagWith([
          { id: 'shared', convergeOn: 'review', maxIterations: 2 },
          { id: 'shared', convergeOn: 'design', maxIterations: 2 },
        ])
      ),
    { message: /resolved loop id.*shared.*collides/ }
  );
});

test("parseDAG rejects loops whose resolved ids collide (explicit id matches another loop's default)", (t) => {
  // Loop 0 has no explicit id: resolves to 'loop-review' via default.
  // Loop 1 explicitly sets id: 'loop-review', convergeOn a different task.
  // Before the fix these two loops silently produced duplicate resolved ids;
  // after the fix parseDAG must throw.
  t.throws(
    () =>
      parseDAG(
        dagWith([
          { convergeOn: 'review', maxIterations: 2 },
          { id: 'loop-review', convergeOn: 'implement', maxIterations: 2 },
        ])
      ),
    { message: /resolved loop id.*loop-review.*collides/ }
  );
});

test('parseDAG rejects explicit ids that collide with defaulted loop ids', (t) => {
  t.throws(
    () =>
      parseDAG(
        dagWith([
          { convergeOn: 'review', maxIterations: 2 },
          { id: 'loop-review', convergeOn: 'design', maxIterations: 2 },
        ])
      ),
    { message: /duplicate loop id/ }
  );
});

test('parseDAG accepts explicit reexecute.tasks when the subset is dependency-closed', (t) => {
  const dag = parseDAG(
    dagWith([
      {
        convergeOn: 'review',
        maxIterations: 2,
        reexecute: {
          kind: 'tasks',
          tasks: ['research', 'design', 'implement'],
        },
      },
    ])
  );
  const reexec = dag.loops![0].reexecute!;
  t.is(reexec.kind, 'tasks');
  if (reexec.kind === 'tasks') {
    // convergeOn is injected so the loop body always re-runs the
    // convergence task itself after upstream re-execution.
    t.deepEqual([...reexec.tasks].sort(), [
      'design',
      'implement',
      'research',
      'review',
    ]);
  }
});

test('parseDAG deduplicates convergeOn from reexecute.tasks when caller includes it explicitly', (t) => {
  const dag = parseDAG(
    dagWith([
      {
        convergeOn: 'review',
        maxIterations: 2,
        reexecute: {
          kind: 'tasks',
          tasks: ['research', 'design', 'implement', 'review'],
        }, // review = convergeOn
      },
    ])
  );
  const reexec = dag.loops![0].reexecute!;
  t.is(reexec.kind, 'tasks');
  if (reexec.kind === 'tasks') {
    // 'review' must appear exactly once despite being both the convergeOn and explicit in the list
    t.deepEqual([...reexec.tasks].sort(), [
      'design',
      'implement',
      'research',
      'review',
    ]);
  }
});

test('parseDAG accepts a pause task as convergeOn (behavior: allowed, convergence semantics may be vacuous)', (t) => {
  const raw = {
    title: 'pause-convergeOn',
    tasks: [
      { id: 'gate', depends_on: [], subtask_prompt: 'wait', kind: 'pause' },
    ],
    loops: [{ convergeOn: 'gate', maxIterations: 1 }],
  };
  const dag = parseDAG(raw);
  t.is(dag.loops![0].convergeOn, 'gate');
});

test('parseDAG rejects reexecute.tasks outside the ancestor cone', (t) => {
  // 'review' depends on 'implement' which depends on 'design' which depends
  // on 'research'. A task `unrelated` that is not in that cone should be
  // rejected (we synthesize one off the side of the DAG).
  const raw = {
    title: 'cone-test',
    tasks: [
      ...baseTasks.map((t) => ({
        id: t.id,
        depends_on: t.depends_on,
        complexity: t.complexity,
        subtask_prompt: t.subtask_prompt,
      })),
      {
        id: 'sibling',
        depends_on: [],
        complexity: 'LOW',
        subtask_prompt: 'sibling',
      },
    ],
    loops: [
      {
        convergeOn: 'review',
        maxIterations: 2,
        reexecute: { kind: 'tasks', tasks: ['sibling'] },
      },
    ],
  };
  t.throws(() => parseDAG(raw), {
    message: /not the convergeOn task and is not a transitive ancestor/,
  });
});

test('parseDAG rejects reexecute.tasks containing unknown task ids', (t) => {
  t.throws(
    () =>
      parseDAG(
        dagWith([
          {
            convergeOn: 'review',
            maxIterations: 2,
            reexecute: { kind: 'tasks', tasks: ['ghost'] },
          },
        ])
      ),
    { message: /unknown task id/ }
  );
});

test('parseDAG rejects non-closed reexecute.tasks subsets', (t) => {
  t.throws(
    () =>
      parseDAG(
        dagWith([
          {
            convergeOn: 'review',
            maxIterations: 2,
            reexecute: { kind: 'tasks', tasks: ['implement'] },
          },
        ])
      ),
    { message: /must be dependency-closed/ }
  );
});

test('parseDAG rejects unknown reexecute.kind', (t) => {
  t.throws(
    () =>
      parseDAG(
        dagWith([
          {
            convergeOn: 'review',
            maxIterations: 2,
            reexecute: { kind: 'all', tasks: [] },
          },
        ])
      ),
    { message: /reexecute\.kind must be one of/ }
  );
});

test('parseDAG with no loops still works', (t) => {
  const dag = parseDAG({
    title: 'no-loops',
    tasks: [
      {
        id: 'only',
        depends_on: [],
        complexity: 'LOW',
        subtask_prompt: 'x',
      },
    ],
  });
  t.is(dag.loops, undefined);
});

test('resolveLoopReexecuteIds with ancestors returns the full cone', (t) => {
  const dag = parseDAG(
    dagWith([{ convergeOn: 'review', maxIterations: 2 }])
  ) as DAG;
  const resolved = resolveConvergenceLoops(dag.loops!);
  const ids = resolveLoopReexecuteIds(resolved[0], dag);
  t.deepEqual([...ids].sort(), ['design', 'implement', 'research', 'review']);
});

test('resolveLoopReexecuteIds with explicit tasks honors the allow-list', (t) => {
  const dag = parseDAG(
    dagWith([
      {
        convergeOn: 'review',
        maxIterations: 2,
        reexecute: {
          kind: 'tasks',
          tasks: ['research', 'design', 'implement'],
        },
      },
    ])
  ) as DAG;
  const resolved = resolveConvergenceLoops(dag.loops!);
  const ids = resolveLoopReexecuteIds(resolved[0], dag);
  // Only the explicit allow-list + convergence task itself.
  t.deepEqual([...ids].sort(), ['design', 'implement', 'research', 'review']);
});

test('resolveConvergenceLoops preserves user-provided id when set', (t) => {
  const dag = parseDAG(
    dagWith([{ id: 'review-loop', convergeOn: 'review', maxIterations: 3 }])
  );
  const resolved = resolveConvergenceLoops(dag.loops!);
  t.is(resolved[0].id, 'review-loop');
  t.is(resolved[0].maxIterations, 3);
});

test('parseDAG accepts multiple loops when their re-execution sets are disjoint', (t) => {
  const tasks = [
    {
      id: 'research',
      depends_on: [],
      complexity: 'LOW',
      subtask_prompt: 'r',
    },
    {
      id: 'docs',
      depends_on: [],
      complexity: 'MED',
      subtask_prompt: 'd',
    },
    {
      id: 'docs-review',
      depends_on: ['docs'],
      complexity: 'HIGH',
      subtask_prompt: 'dr',
    },
    {
      id: 'impl',
      depends_on: [],
      complexity: 'MED',
      subtask_prompt: 'i',
    },
    {
      id: 'impl-review',
      depends_on: ['impl'],
      complexity: 'HIGH',
      subtask_prompt: 'ir',
    },
  ];
  const dag = parseDAG({
    title: 'multi-loop',
    tasks,
    loops: [
      { convergeOn: 'docs-review', maxIterations: 2 },
      { convergeOn: 'impl-review', maxIterations: 2 },
    ],
  });
  t.is(dag.loops!.length, 2);
  const resolved = resolveConvergenceLoops(dag.loops!);
  t.deepEqual(
    resolved.map((l) => l.id),
    ['loop-docs-review', 'loop-impl-review']
  );
});

test('parseDAG rejects loops with overlapping re-execution sets', (t) => {
  t.throws(
    () =>
      parseDAG({
        title: 'overlap',
        tasks: [
          {
            id: 'shared',
            depends_on: [],
            complexity: 'LOW',
            subtask_prompt: 'shared',
          },
          {
            id: 'docs',
            depends_on: ['shared'],
            complexity: 'MED',
            subtask_prompt: 'docs',
          },
          {
            id: 'docs-review',
            depends_on: ['docs'],
            complexity: 'HIGH',
            subtask_prompt: 'docs review',
          },
          {
            id: 'impl',
            depends_on: ['shared'],
            complexity: 'MED',
            subtask_prompt: 'impl',
          },
          {
            id: 'impl-review',
            depends_on: ['impl'],
            complexity: 'HIGH',
            subtask_prompt: 'impl review',
          },
        ],
        loops: [
          { convergeOn: 'docs-review', maxIterations: 2 },
          { convergeOn: 'impl-review', maxIterations: 2 },
        ],
      }),
    { message: /must have disjoint re-execution sets/ }
  );
});

test('parseDAG rejects non-array loops', (t) => {
  t.throws(() => parseDAG(dagWith({ convergeOn: 'review' })), {
    message: /must be an array/,
  });
});

test('DAGConvergenceLoop type round-trips through resolveConvergenceLoops', (t) => {
  const declared: DAGConvergenceLoop[] = [
    {
      id: 'r',
      convergeOn: 'review',
      maxIterations: 5,
      reexecute: {
        kind: 'tasks',
        tasks: ['research', 'design', 'implement', 'review'],
      },
    },
  ];
  const resolved = resolveConvergenceLoops(declared);
  t.deepEqual(resolved[0], {
    id: 'r',
    convergeOn: 'review',
    maxIterations: 5,
    reexecute: {
      kind: 'tasks',
      tasks: ['research', 'design', 'implement', 'review'],
    },
  });
});
