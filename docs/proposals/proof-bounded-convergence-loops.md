# Proposal: First-class bounded convergence loops in `@flatbread/proof`

Status: Implementation
Tracking: branch `toeknee/proof-bounded-loop-cde0` stacked on PR #177

## Why

The earlier discussion on cyclic vs acyclic task graphs (cursor agent
`bc-0ff9d782-…`, run `run-3cc886ad-…`) settled on the position:

- The dependency graph should stay acyclic (DAG `depends_on` edges are
  about static causality and parallelism — letting `depends_on` form a
  cycle destroys readiness, skip, and rank semantics for no benefit).
- "Cyclic flow" is real and useful — research → critique → refine, fix
  → test → fix-until-oracle, write → review → patch — but it is
  bounded refinement, not a back-edge in the dependency graph.

`proof` already implements the right shape, just at the CLI:

- `--converge-on <task-id>` + `--max-iterations <N>` re-executes the
  named task plus its transitive ancestors with the previous result
  stitched into ancestor prompts as `extraContext`.
- The loop body parses `## Blockers` and `## High-severity findings`
  and exits when both are empty, otherwise marks the convergence task
  `BUDGET-EXCEEDED` after exhausting the iteration cap.

Three real limitations:

1. **Only one convergence task per run.** The CLI flag is a singleton;
   you cannot stack a code-review loop and a docs-review loop in the
   same DAG.
2. **The "what to re-execute" set is hardcoded** to "all transitive
   ancestors". For wide DAGs you often want to re-run only a focused
   subset (say, the implementation task and the reviewer, not the
   six independent research tasks at the root).
3. **The convergence config lives outside the DAG JSON.** A DAG
   author who wants reproducible convergence has to remember to pass
   the right CLI flags every run, and tooling that emits DAGs has no
   way to declare loop intent.

This proposal adds a first-class, DAG-native bounded loop primitive
that subsumes the CLI flag without breaking it.

## What

Add an optional top-level `DAG.loops` array. Each entry is a
`DAGConvergenceLoop`:

```jsonc
{
  "title": "implementation + adversarial review",
  "loops": [
    {
      "id": "review-loop",
      "convergeOn": "review",
      "maxIterations": 3,
      "reexecute": { "kind": "ancestors" }
    }
  ],
  "tasks": [
    /* … */
  ]
}
```

### Schema

```ts
export type LoopReexecute =
  | { kind: 'ancestors' }
  | { kind: 'tasks'; tasks: string[] };

export interface DAGConvergenceLoop {
  /** Stable id for canvas/log display. Defaults to `loop-${convergeOn}`. */
  id?: string;
  /** Task whose `## Blockers` / `## High-severity findings` drive the loop. */
  convergeOn: string;
  /** Iteration ceiling. Iteration 0 is the original main-rank run. */
  maxIterations: number;
  /** What to re-execute on each iteration. Defaults to `{ kind: 'ancestors' }`. */
  reexecute?: LoopReexecute;
}
```

### Validation rules

- `convergeOn` must be a known task id.
- `maxIterations` must be a positive integer.
- For `reexecute.kind === 'tasks'`: every entry must be a known task
  id; the set must be a subset of `transitiveAncestors(convergeOn) ∪ {convergeOn}`
  (re-executing tasks outside the convergence ancestor cone breaks
  topological re-execution order — explicit error rather than silent
  divergence). Every non-`convergeOn` task in the list must also bring along
  its own transitive ancestors so the rerun subset is dependency-closed.
- Two loops cannot share the same `convergeOn` (avoids ambiguous
  iteration counter ownership).
- `id` must be unique across loops after defaults are applied, so an explicit
  `id: "loop-review"` cannot collide with another loop whose defaulted id would
  also be `loop-review`.
- Two loops must have disjoint re-execution sets. If they overlap, the parser
  rejects the DAG rather than letting a later loop silently invalidate an
  earlier loop's converged outcome.
- The CLI `--converge-on` flag is mutually exclusive with `DAG.loops`
  — supplying both is an error rather than a silent precedence rule.

### Runner behavior

The existing `runConvergenceLoop` function generalizes:

- Caller supplies an explicit `reExecIds` set instead of computing
  `transitiveAncestors(convergeOn) ∪ {convergeOn}` inside the loop.
- The CLI flag synthesizes a single-element `loops` array so the same
  code path covers both entry points.
- Multiple loops run sequentially (in declaration order). Each loop's
  `BUDGET-EXCEEDED` propagates to the run-level outcome the same way
  the single CLI loop does today.
- Runner restarts resume from the persisted convergence iteration counter
  instead of replaying iteration numbers from `1`.
- `dag.budget.maxIterations` continues to work and applies to each
  loop independently — it is a hard cap on the per-loop iteration
  counter, not a global counter.

### What is intentionally out of scope (this PR)

- Alternate loop stop predicates. The existing parser
  (`extractConvergenceFindings` in `converge_loop.ts`) is the only stop rule;
  richer predicates (oracle-pass, numeric thresholds) can land in follow-ups
  once there is a concrete runtime need.
- Nested loops (loop inside loop). The flat array is enough for
  every workflow we have today.
- Cross-loop coordination (loop A waits on loop B's iteration N).
  Same reasoning — no real demand and would force a bigger
  scheduler rewrite.

## Backward compatibility

- DAG JSON without `loops` keeps parsing untouched.
- The CLI flags `--converge-on` and `--max-iterations` keep working
  end-to-end. Their behavior is reimplemented as a synthesized
  single-element loops array.
- `DAG.budget.maxIterations` keeps the same meaning (per-loop hard
  cap) and the same `BUDGET-EXCEEDED` terminal status.
- The `extractConvergenceFindings` parser, the `findings-dir`
  sidecar contract, and the `extraContext` stitching format are
  unchanged. Existing reviewer prompts keep working.

## Test plan

Focused AVA tests (`packages/proof/src/__tests__/loops.test.ts`, runnable via
`pnpm -F @flatbread/proof test` and included in root `pnpm test`):

- `parseDAG` accepts `loops` with default `reexecute`.
- `parseDAG` rejects `convergeOn` referencing an unknown task id.
- `parseDAG` rejects two loops with the same `convergeOn`.
- `parseDAG` rejects two loops with the same materialized `id` (including
  defaulted `loop-${convergeOn}` collisions).
- `parseDAG` rejects `reexecute.tasks` containing unknown ids or ids
  outside the convergence ancestor cone, and rejects non-closed subsets.
- `parseDAG` rejects overlapping loop re-execution sets.
- `parseDAG` rejects non-positive `maxIterations`.
- `resolveLoopReexecuteIds` returns the right id set for both
  `'ancestors'` and explicit `tasks` modes.
- Re-execution rank filtering preserves topological order for the
  filtered subset.

Backward-compat smoke:

- A DAG with no `loops` and no CLI `--converge-on` runs zero
  convergence iterations (existing behavior).
- A DAG with no `loops` plus CLI `--converge-on` synthesizes one
  loop and runs it.
- A DAG with `loops` plus CLI `--converge-on` errors at startup.

Self-review via `/proof` is the user-facing acceptance test; this
PR's test plan above is what gates the merge. Contributor-facing command:

```bash
pnpm -F @flatbread/proof test
```

## Migration

No code changes required for existing DAG JSON. Authors who want
DAG-native convergence can move from:

```bash
proof --dag run.json --converge-on review --max-iterations 3
```

…to:

```jsonc
// run.json
{
  "loops": [{ "convergeOn": "review", "maxIterations": 3 }],
  "tasks": [
    /* … */
  ]
}
```

```bash
proof --dag run.json
```

The CLI form stays valid for ad-hoc runs.
