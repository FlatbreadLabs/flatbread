# Proof

Proof is Flatbread's DAG task runner for Cursor agents. It decomposes a task into a graph of subagents, runs each node in topological order, and writes a live `.canvas.tsx` so you can watch the work move from `PENDING` to `RUNNING` to `FINISHED` or `ERROR`.

The package ships as `@flatbread/proof` and exposes:

- `proof`: run a DAG or initialize its canvas.
- `proof-supervisor`: run Proof in self-hosting mode so edits to `packages/proof/src/**` can be picked up between ranks.
- Library exports for tooling that wants to author, validate, or inspect DAGs programmatically.

## Quick Start

Build the package once after installing dependencies:

```bash
pnpm -F @flatbread/proof build
```

Create a DAG JSON file:

```json
{
  "title": "Build a tiny CLI todo app",
  "tasks": [
    {
      "id": "design",
      "depends_on": [],
      "complexity": "LOW",
      "subtask_prompt": "Design the minimal CLI commands and file layout."
    },
    {
      "id": "implement",
      "depends_on": ["design"],
      "complexity": "MED",
      "subtask_prompt": "Implement the todo CLI based on the design."
    }
  ]
}
```

Initialize a canvas without requiring `CURSOR_API_KEY`:

```bash
pnpm exec proof \
  --init-only \
  --dag /tmp/example-dag.json \
  --canvas-path /tmp/example-dag.canvas.tsx
```

Run the DAG:

```bash
export CURSOR_API_KEY=crsr_...

pnpm exec proof \
  --dag /tmp/example-dag.json \
  --canvas-path /tmp/example-dag.canvas.tsx
```

## DAG Shape

Every DAG has a `title` and a `tasks` array. Each task needs:

- `id`: unique kebab-case task id.
- `depends_on`: ids of parent tasks that must finish first.
- `complexity`: `HIGH`, `MED`, or `LOW`; maps to a Cursor model.
- `subtask_prompt`: standalone instructions for the subagent.

Proof computes ranks with Kahn topological sort and runs sibling tasks in the same rank concurrently. Avoid placing two sibling tasks in the same rank if they write the same files.

Optional top-level `models` can override the default complexity map with plain
SDK model id strings or SDK model selections:

```json
{
  "models": {
    "HIGH": {
      "id": "gpt-5.4",
      "params": [{ "id": "reasoning", "value": "high" }]
    },
    "MED": "composer-2",
    "LOW": {
      "id": "gpt-5.4-nano",
      "params": [{ "id": "reasoning", "value": "low" }]
    }
  }
}
```

Use the object shape when you need `params`; use a string when the model id is
enough. For example, use `{ "id": "gpt-5.4", "params": [{ "id": "reasoning", "value": "high" }] }`, not a suffix-style id like `gpt-5.4-high`.

When a DAG runs, Proof calls `Cursor.models.list()`, validates model ids and
param values, and expands partial selections to the closest valid SDK preset
variant using that model's default variant for omitted params. `--init-only`
does not call the SDK, so it can still render a canvas without `CURSOR_API_KEY`.

Optional task kinds add control gates:

- `kind: "oracle"` runs a shell command and records pass/fail evidence.
- `kind: "pause"` waits for a checkpoint sentinel so a human can inspect or approve before downstream work continues.

## Artifact Output

By default, every run writes per-task markdown transcripts to a timestamped directory:

```
~/.cursor/projects/<workspace-slug>/artifacts/dag-<title-slug>-<timestamp>/
  _dag.json      # The original DAG definition
  _index.md      # Run summary: outcome, timings, and links to all transcripts
  <task-id>.md   # Full agent output for each task (kind: task, oracle, or pause)
```

This mirrors the canvas path scheme so artifacts and canvases live together under `~/.cursor/projects/<workspace-slug>/`.

To suppress artifact writing:

```bash
pnpm exec proof --dag /tmp/my.json --canvas-path /tmp/my.canvas.tsx --no-artifacts
```

To write artifacts to a custom path:

```bash
pnpm exec proof --dag /tmp/my.json --canvas-path /tmp/my.canvas.tsx \
  --full-output-dir /path/to/my-artifacts/
```

## Project Skill

The canonical Cursor skill entrypoint lives at:

```text
.cursor/skills/proof/SKILL.md
```

Use that skill when a request asks to decompose work, run subagents in parallel, or execute a task as a dependency graph. The legacy `.cursor/skills/dag-task-runner/SKILL.md` entry remains as a compatibility handoff and points to Proof.

## Self-Hosting Mode

When the DAG may edit Proof itself, use the supervisor:

```bash
pnpm exec proof-supervisor \
  --dag /tmp/example-dag.json \
  --canvas-path /tmp/example-dag.canvas.tsx \
  --state-path /tmp/example-dag-state.json
```

The supervisor adds `--restart-on-runner-change`. If runtime files change after a rank, Proof persists state, exits with code `75`, and the supervisor resumes from the state file under the rebuilt runtime.

After editing `packages/proof/src/**`, rebuild before resuming packaged CLI runs:

```bash
pnpm -F @flatbread/proof build
```

## Useful Commands

```bash
pnpm -F @flatbread/proof typecheck
pnpm -F @flatbread/proof build
pnpm -F @flatbread/proof models:list
pnpm exec proof --dry-check-cmds --dag .cursor/skills/proof/examples/example_dag.json
```

## Library API

Proof also exposes helpers for tooling:

```ts
import {
  computeRanks,
  createModelSelectionResolver,
  parseDAG,
  resolveModelSelectionFromCatalog,
  runDryCheck,
  type DAG,
  type TaskState,
} from '@flatbread/proof';
```

The public API includes DAG parsing and rank computation, model resolution, canvas state types, convergence helpers, dry command checks, oracle and pause helpers, and self-hosting state utilities.
