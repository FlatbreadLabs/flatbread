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

## `DAG.loops`

Bounded convergence loops can live in the DAG itself instead of only on the CLI. This keeps the run reproducible: contributors do not need to remember a matching `--converge-on ... --max-iterations ...` flag pair.

```json
{
  "title": "implement then review until clean",
  "loops": [
    {
      "convergeOn": "review",
      "maxIterations": 3,
      "reexecute": { "kind": "tasks", "tasks": ["implement"] }
    }
  ],
  "tasks": [
    {
      "id": "implement",
      "depends_on": [],
      "complexity": "MED",
      "subtask_prompt": "Implement the feature."
    },
    {
      "id": "review",
      "depends_on": ["implement"],
      "complexity": "HIGH",
      "subtask_prompt": "Review the implementation. Use `## Blockers` and `## High-severity findings` when needed."
    }
  ]
}
```

Notes:

- Omit `id` to get the default `loop-<convergeOn>` id.
- Omit `reexecute` to re-run the full ancestor cone, which matches the legacy CLI behavior.
- `reexecute: { "kind": "tasks", "tasks": [...] }` must stay inside the convergence task's ancestor cone and be dependency-closed for every non-`convergeOn` task it names; invalid subsets fail fast during DAG parsing with the missing ancestor ids.
- Parsed explicit rerun lists always include `convergeOn` itself, even if the authored JSON omits it.
- `DAG.loops` and `--converge-on` are mutually exclusive. If the DAG already declares loops, remove the CLI flag instead of relying on precedence.
- Multiple loops are allowed only when their re-execution sets are disjoint, so one loop cannot invalidate another loop's converged result later in the run.

## Artifact Output

By default, every **full DAG run** writes per-task markdown transcripts to a timestamped directory (not `--init-only`, which exits before artifact setup, and not `--dry-check-cmds`, which never enters the runner):

```
<repo-root>/.flatbread/artifacts/dag-<title-slug>-<timestamp>/
  _dag.json      # The original DAG definition
  _index.md      # Run summary: outcome, timings, and links to all transcripts
  <task-id>.md   # Full agent output for each task (kind: task, oracle, or pause)
  <task-id>.stream.txt   # Append-only assistant transcript mirror (`kind: task` only)
```

**Execution vs canvas:**

- For `kind: "task"` only, stitched prompts, in-process convergence parsing (`--converge-on` / `DAG.loops`), `${task-id}.findings.json` payloads (`--findings-dir`), and `<task-id>.md` derive from an **execution-authoritative** transcript. Resumed runs can reconstruct that transcript when the same `--full-output-dir` is reused and `transcriptPath` points at `${task-id}.stream.txt`; otherwise legacy bounded `resultText` remains the fallback.
- The inlined canvas payload snapshots only a **4000-character display tail** (`CANVAS_DISPLAY_CAP`) per task plus an optional **`transcriptPath`** when `${task-id}.stream.txt` is mirrored.
- Author `DAG.outputPolicy.upstream` as `"full"` or `"summarize"` (default) to widen or keep the upstream excerpt policy; trims carry visible counted banners.
- Downstream nodes are skipped with `ERROR` when any upstream is `ERROR` or `BUDGET-EXCEEDED`.

Paths resolve from `--cwd` (defaults to the process working directory). The live canvas still defaults under `~/.cursor/projects/<workspace-slug>/canvases/` when using `--canvas` without `--canvas-path`.

Previously, transcripts only appeared when you passed `--full-output-dir`; now they land under `.flatbread/` by default. Use `--no-artifacts` for opt-out, or `--full-output-dir` to redirect elsewhere.

`--no-artifacts` suppresses transcripts, `_index.md`, and `_dag.json` only. **`--findings-dir` JSON sidecars use a separate path** — omit that flag (or point it elsewhere) if you need completely artifact-free output besides the canvas.

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

Each supervisor-spawned runner picks a **new default** `.flatbread/artifacts/dag-<slug>-<timestamp>/` directory unless you pin **`--full-output-dir <path>` on the supervisor command** so every child inherits the same path.

After editing `packages/proof/src/**`, rebuild before resuming packaged CLI runs:

```bash
pnpm -F @flatbread/proof build
```

## Useful Commands

```bash
pnpm -F @flatbread/proof typecheck
pnpm -F @flatbread/proof build
pnpm -F @flatbread/proof test
pnpm test
pnpm -F @flatbread/proof models:list
pnpm exec proof --dry-check-cmds --dag .cursor/skills/proof/examples/example_dag.json
```

`pnpm -F @flatbread/proof test` is the focused bounded-loop suite. Root `pnpm test` also reaches that AVA file through `ava.config.js`.

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
