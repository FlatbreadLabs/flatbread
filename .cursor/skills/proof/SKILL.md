---
name: proof
description: Decompose a user's task into a DAG of subtasks and execute them with Cursor SDK local subagents in topological order, rendering live streaming status to a canvas. Each task has a complexity (HIGH/MED/LOW) that maps to a model. Use when the user asks to fan out work, decompose a task into a DAG, run subagents in parallel, or break a large task into a dependency graph.
---

# Proof

Decomposes a user-described task into a JSON DAG, then runs each node as a Cursor SDK local subagent (with parents' outputs stitched into the child's prompt). Live DAG state — including each running subagent's streaming output — is rendered into a `.canvas.tsx` that the runner rewrites on every status transition; the IDE hot-recompiles so the user sees subagents move through `PENDING -> RUNNING -> FINISHED/ERROR` in real time.

The runtime ships as the workspace package `@flatbread/proof` (`packages/proof`). It exposes two CLIs — `proof` (runner) and `proof-supervisor` (self-hosting wrapper) — plus a public library API for tooling that wants to author or inspect DAGs programmatically.

## When to use

Trigger when the user says any of:

- "decompose this task", "break this into a DAG", "fan out subagents"
- "run this as a graph of subtasks"
- a multi-step request where some steps clearly depend on others and others can run in parallel

Skip when the task is a single-shot edit, a quick question, or already linear enough that one agent turn would handle it.

## Workflow

### Step 1 — Generate a DAG JSON

You (the parent agent) author the DAG inline using your understanding of the user's task. Schema:

```json
{
  "title": "<short human-readable title for the run>",
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
  },
  "tasks": [
    {
      "id": "<unique kebab-case id>",
      "depends_on": ["<id>", "..."],
      "complexity": "HIGH | MED | LOW",
      "subtask_prompt": "<self-contained prompt for the subagent>"
    }
  ]
}
```

Rules:

- Every `depends_on` entry must reference another task's `id`.
- No cycles. The runner rejects cyclic DAGs at parse time.
- `complexity` controls the model the subagent uses (see table below). Pick `HIGH` for novel/complex reasoning, `MED` for typical implementation, `LOW` for mechanical/lookup tasks.
- Optional top-level `models` can override the default complexity → model map for this DAG. Values can be plain SDK model id strings or model selection objects of the shape `{ "id": "...", "params": [{ "id": "...", "value": "..." }] }`, with `params` omitted when unused.
- `subtask_prompt` should read like a standalone request — the runner automatically prepends a short summary of upstream task outputs, so you do not need to repeat them.
- Do **not** put two tasks that write to the same file in the same rank (siblings within a rank run concurrently and would race).

#### Maximize parallelism — this is the whole point of the runner

The runner executes tasks within a rank **concurrently** via `Promise.all`. A linear `A → B → C → D` DAG wastes that capability. Before finalizing the DAG, actively decompose the problem to surface independent work:

1. **Default to no dependencies.** Add a `depends_on` entry **only** when the child task literally cannot start without the parent's output. "Logically follows" is not a dependency.
2. **Split read-only research and discovery into a wide first rank.** Codebase grepping, doc reading, dependency scans, schema lookups, test inventory — these almost always share rank 1 with no edges between them.
3. **Fan out post-implementation work.** Tests, docs, changelog entries, type updates, lint fixes typically all depend on the same implementation task and on nothing else — put them in one rank, not a chain.
4. **Use diamonds, not lines.** If two tasks both feed into a third, model that explicitly: rank 1 has the two parents, rank 2 is the merge.
5. **Same-rank file-write safety.** The one hard constraint: don't put two tasks in the same rank if they would write the same file. Either serialize them with a `depends_on`, or merge them into one task.

Quality bar: when you sketch the rank structure (rank 1 → rank 2 → …), at least one rank should contain more than one task in any non-trivial problem. If your DAG is a single chain of 1-task ranks, you almost certainly missed parallelism — go back and look again.

The example shipped with the skill (`.cursor/skills/proof/examples/example_dag.json`) demonstrates the pattern: rank 1 fans out to two read-only research tasks, rank 2 merges them into a design, rank 3 implements, and rank 4 fans out again to tests + docs.

Write the JSON to a temp file **and immediately generate the initial canvas** so the user can open it while subagents spin up. Run all of the following in a single shell block:

```bash
# 0. Pick a canvas path
CANVAS_PATH="$HOME/.cursor/projects/<workspace-slug>/canvases/dag-<slug>.canvas.tsx"

# 1. Write the DAG JSON
cat > /tmp/dag-<slug>.json <<'JSON'
{ "title": "...", "tasks": [ ... ] }
JSON

# 2. Build the @flatbread/proof package once per workspace install
#    (skipped if dist/ is already present; safe to re-run).
[ -f "$(git rev-parse --show-toplevel)/packages/proof/dist/run_dag.js" ] || \
  pnpm -F @flatbread/proof build

# 3. Generate the initial all-PENDING canvas (no CURSOR_API_KEY needed)
pnpm exec proof \
  --init-only \
  --dag /tmp/dag-<slug>.json \
  --canvas-path "$CANVAS_PATH"

# 4. Best-effort auto-open of the canvas file; ignore failure in headless/non-macOS environments
open "$CANVAS_PATH" >/dev/null 2>&1 || true
```

The canvas path is:

```
~/.cursor/projects/<workspace-slug>/canvases/dag-<slug>.canvas.tsx
```

`<workspace-slug>` is derived from the cwd's absolute path by stripping the leading `/`, replacing path separators with `-`, and sanitizing other non-alphanumeric characters within each path segment to `-`. Example: cwd `/Users/me/Code/myapp` → slug `Users-me-Code-myapp`. Use the same `<slug>` you used for the DAG JSON filename so they're easy to correlate.

### Step 2 — Surface the canvas link in chat

Now that the file exists on disk, post a Markdown hyperlink with the exact text `Open Canvas` and a `file://` URL, plus the absolute path for fallback:

> I created a live canvas: [Open Canvas](file:///Users/<user>/.cursor/projects/<workspace-slug>/canvases/dag-<slug>.canvas.tsx)
> Fallback path: `/Users/<user>/.cursor/projects/<workspace-slug>/canvases/dag-<slug>.canvas.tsx`

Always use the link text `Open Canvas`. Use the absolute path in both the `file://` URL and fallback path, never `~/`. Do this **before** Step 3 so the user can open the canvas while subagents are still spinning up. The Step 1 shell block already attempts to auto-open the canvas with `open`; if that fails, continue and rely on the chat link.

### Step 3 — Run the DAG

Ensure `CURSOR_API_KEY` is set (the runner fails fast if missing), then launch:

```bash
[ -n "$CURSOR_API_KEY" ] || { [ -f .env ] && set -a && source .env && set +a; }

pnpm exec proof \
  --dag /tmp/dag-<slug>.json \
  --canvas-path "$CANVAS_PATH"
```

If the DAG is expected to edit the runner itself (`packages/proof/src/**`), launch through the supervisor instead so source edits take effect at a process boundary:

```bash
pnpm exec proof-supervisor \
  --dag /tmp/dag-<slug>.json \
  --canvas-path "$CANVAS_PATH" \
  --state-path "$HOME/.cursor/projects/<workspace-slug>/dag-state/<slug>.json"
```

The supervisor passes `--restart-on-runner-change` to the runner. When runner runtime files change after a rank or convergence iteration, the child runner persists state, marks the canvas `RESTARTING RUNNER`, exits `75`, and the supervisor relaunches with `--resume-state` so pending tasks continue under the new source. After editing `packages/proof/src/**`, run `pnpm -F @flatbread/proof build` so the relaunch picks up the new code.

Same `--canvas-path` as Step 1. The runner:

1. Validates the DAG and reuses the existing canvas file.
2. For each rank (Kahn topo-sort), launches ready tasks concurrently as local Cursor SDK agents and rewrites the canvas as each one transitions, streaming assistant text into each task card live.
3. Automatically skips tasks whose upstream dependencies failed (marks them `ERROR` with a "Skipped: upstream task(s) … failed" message).
4. Captures each subagent's final assistant text, status, token usage, and duration.
5. Writes a final canvas with summary stats.
6. Artifact output (default, suppress with `--no-artifacts` or override path with `--full-output-dir`; skipped entirely for `--init-only` and `--dry-check-cmds`):
   - **At run start:** writes `_dag.json` (the original DAG definition) to the artifacts directory.
   - **As each task finishes:** writes `${taskId}.md` (full transcript for `kind: task`, `oracle`, and `pause`).
   - **At run end:** best-effort `_index.md` (run summary table with timestamps, outcome, and per-task links for transcripts that exist); write failures are logged as `[proof]` warnings rather than crashing the runner.
7. On SIGINT/SIGTERM/SIGHUP, cancels all in-flight subagents before finalizing the canvas.

#### CLI knobs

| Flag                            | Default            | Purpose                                                                                                                                                            |
| ------------------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--models-file <path>`          | —                  | JSON file containing a partial complexity → model override map.                                                                                                    |
| `--state-path <path>`           | —                  | Persist resumable state after rank boundaries.                                                                                                                     |
| `--resume-state <path>`         | —                  | Resume from a persisted state file.                                                                                                                                |
| `--restart-on-runner-change`    | `false`            | Exit `75` after runner runtime files change so a supervisor can relaunch.                                                                                          |
| `--task-timeout-ms <ms>`        | `1200000` (20 min) | Marks a task `ERROR` if it runs too long.                                                                                                                          |
| `--stream-publish-ms <ms>`      | `500`              | Throttles live canvas streaming writes.                                                                                                                            |
| `--stream-idle-timeout-ms <ms>` | `300000` (5 min)   | Marks a task `ERROR` if no stream events arrive.                                                                                                                   |
| `--debounce <ms>`               | `200`              | Canvas write debounce interval.                                                                                                                                    |
| `--full-output-dir <path>`      | computed default   | Per-task transcripts + `_index.md` + `_dag.json`. Default: `<cwd>/.flatbread/artifacts/dag-<title-slug>-<ts>/`. Override path or suppress with `--no-artifacts`.   |
| `--no-artifacts`                | `false`            | Suppresses per-task transcripts, `_index.md`, and `_dag.json`; does **not** suppress `--findings-dir` JSON sidecars (separate code path). Canvas is still written. |

### Step 4 — Summarize

After the runner exits, briefly summarize what completed/failed and re-link the canvas with the exact text `[Open Canvas](file:///Users/<user>/.cursor/projects/<workspace-slug>/canvases/dag-<slug>.canvas.tsx)` so the user can scroll back to it. Include the absolute fallback path only if useful.

## Complexity → model

| Complexity | Model             |
| ---------- | ----------------- |
| HIGH       | `claude-opus-4-7` |
| MED        | `composer-2`      |
| LOW        | `gpt-5.4-nano`    |

Override any subset inline with top-level DAG `models`, or pass a reusable profile with `--models-file <path>`. Values can be plain SDK model id strings or SDK model selections with `params`. At run time, Proof calls `Cursor.models.list()`, validates ids and param values, and expands partial selections by requiring requested params to match a catalog variant, then choosing the valid variant whose omitted params best match the model's default variant. Precedence is defaults < DAG `models` < `--models-file`. The Cursor model catalog can vary by account.

To use a cheaper high-capability GPT model, use the base SDK id plus params, not a suffix-style id:

```json
{
  "models": {
    "HIGH": {
      "id": "gpt-5.4",
      "params": [{ "id": "reasoning", "value": "high" }]
    }
  }
}
```

### Discovering valid model ids

Many Cursor CLI catalog models encode reasoning effort and Max Mode as **slug suffixes** (e.g. `claude-opus-4-7-thinking-max`, `gpt-5.5-extra-high`, `gpt-5.3-codex-xhigh`), but the Cursor SDK may accept only base slugs plus `params`. Do not compose SDK model ids from CLI suffixes by hand: use `{ "id": "gpt-5.4", "params": [{ "id": "reasoning", "value": "high" }] }`, not `gpt-5.4-high`. For SDK-bound code, prefer `Cursor.models.list()` or the SDK's `ConfigurationError` catalog over `cursor-agent --list-models`.

Ways to enumerate model ids:

```bash
# CLI catalog — useful for CLI runs, not authoritative for @cursor/sdk
cursor-agent --list-models

# SDK-flavored alternative — also prints any per-model `parameters` and preset `variants`
pnpm -F @flatbread/proof models:list                  # all ids
pnpm -F @flatbread/proof models:list <model-id>       # detail for one model
pnpm -F @flatbread/proof models:list --grep <text>    # case-insensitive filter
pnpm -F @flatbread/proof models:list --json <model-id>
```

## Auth

The runner reads `CURSOR_API_KEY` from the environment. Set it however you usually manage secrets:

```bash
export CURSOR_API_KEY=crsr_...
```

If the current workspace has a `.env` containing it, source that first:

```bash
set -a && source .env && set +a
```

## CLI options

| Flag                         | Default             | Notes                                                                                                                                                                                                       |
| ---------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--dag`                      | required            | Path to the DAG JSON file.                                                                                                                                                                                  |
| `--canvas-path`              | composed from below | Full path to the canvas file. Preferred as an absolute path for parent-managed flow; relative paths are accepted and resolve from the runner process cwd, not `--cwd`.                                      |
| `--canvas`                   | —                   | Canvas filename stem (no `.canvas.tsx`). Used only if `--canvas-path` is omitted.                                                                                                                           |
| `--canvases-dir`             | derived from cwd    | Override the canvases output directory. Used only with `--canvas`.                                                                                                                                          |
| `--cwd`                      | `process.cwd()`     | Working dir each subagent operates in.                                                                                                                                                                      |
| `--models-file`              | —                   | JSON file containing a partial complexity → model override map.                                                                                                                                             |
| `--debounce`                 | `200` (ms)          | Canvas write debounce interval.                                                                                                                                                                             |
| `--init-only`                | `false`             | Write the initial all-`PENDING` canvas and exit. No `CURSOR_API_KEY` required.                                                                                                                              |
| `--full-output-dir`          | computed default    | Per-task transcripts as `${taskId}.md` plus `_index.md` and `_dag.json`. Defaults to `<cwd>/.flatbread/artifacts/dag-<title-slug>-<ts>/`. Override with an explicit path or suppress with `--no-artifacts`. |
| `--no-artifacts`             | `false`             | Suppresses per-task transcripts, `_index.md`, and `_dag.json`; does **not** suppress `--findings-dir` JSON sidecars (separate code path). Canvas is still written.                                          |
| `--findings-dir`             | —                   | Per-task JSON sidecars as `${taskId}.findings.json` for original runs and `${taskId}.iter<n>.findings.json` for convergence re-runs. Schema: `{ taskId, iteration, status, durationMs, sections }`.         |
| `--state-path`               | —                   | Persist resumable runner state. Defaults to `.proof/run-state.json` when `--restart-on-runner-change` is set.                                                                                               |
| `--resume-state`             | —                   | Load a persisted `RunState` and skip already terminal tasks.                                                                                                                                                |
| `--restart-on-runner-change` | `false`             | Detect runner runtime file changes after safe boundaries and exit `75` for supervisor restart.                                                                                                              |
| `--max-runner-restarts`      | `20`                | Supervisor-only cap for relaunches from `proof-supervisor`.                                                                                                                                                 |
| `--task-timeout-ms`          | `1200000` (20 min)  | Marks a task `ERROR` if it exceeds this duration.                                                                                                                                                           |
| `--stream-publish-ms`        | `500` (ms)          | Throttles live canvas streaming writes to avoid excessive cloning.                                                                                                                                          |
| `--stream-idle-timeout-ms`   | `300000` (5 min)    | Marks a task `ERROR` if no stream events arrive within this window.                                                                                                                                         |

## Caveats

- Per-task markdown transcripts, a run index (`_index.md`), and the DAG definition (`_dag.json`) are written under **`<cwd>/.flatbread/artifacts/`** by default on **full DAG runs** (not `--init-only` or `--dry-check-cmds`). Pass `--no-artifacts` to suppress transcripts/index/DAG JSON, or `--full-output-dir` to override the path. `_index.md` links only transcripts that exist; if an individual transcript write fails, that row is marked as a missing transcript. **`--no-artifacts` does not disable `--findings-dir`** — for fully clean disk output, omit `--findings-dir` as well. In CI or read-only workspaces you may want `--no-artifacts` or a writable `--full-output-dir`.
- When using `proof-supervisor`, each **child runner process** recomputes the default artifacts path with a new timestamp unless you pin a stable directory. The supervisor forwards the full argv to each child (only `--max-runner-restarts` is stripped), so put **`--full-output-dir <path>` on the supervisor invocation** if every restart should write into the same artifacts folder.
- `--resume-state` creates a new artifact directory for the resumed session; tasks completed in prior sessions do not have transcripts in the new directory.
- Local runtime only — every subagent runs against `--cwd` (defaults to wherever you invoke the runner).
- Sibling tasks in the same rank run in parallel; do not let them write the same files.
- Inline MCP servers and sub-sub-agents are not configured by this runner.
- A failed task automatically skips all downstream dependents (they are marked `ERROR` with a "Skipped: upstream task(s) … failed" message). This prevents wasted API calls on tasks whose inputs are missing.
- Per-task streamed text is capped at `STREAM_CAP = 4000` chars to keep the canvas file modest. Upstream context passed to child tasks is capped at 2000 chars per parent, with section-aware truncation when the parent output contains multiple `##` sections.
- Timed-out tasks are marked `ERROR` instead of staying indefinitely in `RUNNING`.
- SIGINT/SIGTERM/SIGHUP gracefully cancel all in-flight subagents and finalize the canvas before exiting.
- Unexpected unhandled rejections from SDK internals are suppressed to prevent runner crashes; uncaught exceptions are logged and trigger a clean shutdown.

## Reference

- Package: `@flatbread/proof` at `packages/proof`
- DAG schema example: `.cursor/skills/proof/examples/example_dag.json`
- Library exports: `import { parseDAG, computeRanks, ... } from '@flatbread/proof'`
- Cursor SDK docs: https://cursor.com/docs/api/sdk/typescript
