# Owned Proof Guidelines Bundle

This file is derived by `pnpm exec proof setup`. Do not hand-edit it; edit the source files listed below instead.

## Maintenance Contract

- If Proof-related work changes rules, docs, skills, prompts, or runtime behavior, update the authoritative source files, run `pnpm -F @flatbread/proof build`, and rerun `pnpm exec proof setup` before concluding so the owned-guidelines bundle and manifest do not go stale.
- This derived bundle lives at `.flatbread/proof/setup/owned-guidelines.bundle.md` and is only trustworthy when its manifest matches the current source files.
- Treat the source files as authoritative when reconciling conflicts between this bundle and the repo.

## Included Sources

- `.cursor/rules/proof-usage-guardrails.mdc` (workspace-rule, sha256=e0c1aca4f65a87de7151f399b79bcf16df7ae83e96c6d098ab98cf57ec3a602d)
- `AGENTS.md` (workspace-contract, sha256=f7b38cb7d9b82ed2384f6c2f4bc5ae6f5cfe35d86712215650326115bdd7b76c)
- `packages/proof/README.md` (package-readme, sha256=fe2a8378e21fe8b3ea32600c5cf9f7f82d095085ce3229efe9bf9a06f858fa38)
- `.cursor/skills/proof/SKILL.md` (skill, sha256=fb8b12568afc9c42175412af7d5d61d9904fc895eb0cb3268e6e29cf5d3bf43d)
- `.cursor/skills/dag-task-runner/SKILL.md` (skill, sha256=8e3071f34dedf182a8cebd763e84bae5144d99d5758d3edf815ed6051f8baac1)

## Missing Expected Sources

_None._

## Source: `.cursor/rules/proof-usage-guardrails.mdc`

Category: workspace-rule

```md
---
description: Proof DAG guardrails for one-shot verification commands
alwaysApply: true
---

# Proof Usage Guardrails

When using `/proof` or authoring a DAG for `@flatbread/proof` in this repo:

- Write verifier/test-task prompts so they require **one-shot commands only**. Say this explicitly in the prompt.
- Before using a package `test` script in a verifier task, check whether it is watch mode in that package's `package.json` or in `AGENTS.md`.
- Never use bare `vitest` in Proof verification tasks. Use `vitest run` via the package manager instead.
- Avoid generic commands like `pnpm --filter <pkg> test` when that package's `test` script may watch. Prefer explicit one-shot commands.
- Repo-specific safe examples:
  - `pnpm exec ava <path-to-test-file>`
  - `pnpm -F @flatbread/codegen exec vitest run`
  - `pnpm -F @flatbread/utils exec vitest run`
  - `pnpm -F @flatbread/proof test`
- In verification/review rungs, prefer naming the exact commands to run instead of saying "run relevant tests".
- If a Proof verification task accidentally starts a watcher or other non-terminating process, stop it, treat that as a prompt bug, and rerun with an explicit one-shot command.
- If Proof-related work changes rules, docs, skills, prompts, or runtime behavior, update the authoritative Proof guidance sources, run `pnpm -F @flatbread/proof build`, and rerun `pnpm exec proof setup` so the owned-guidelines bundle and manifest do not self-stale through stale packaged setup code.
```

## Source: `AGENTS.md`

Category: workspace-contract

```md
# Agents

## Cursor Cloud specific instructions

### Overview

Flatbread is Git-native **relational content for TypeScript/JavaScript apps**: flat files become a typed graph; **GraphQL is one read surface**, not the whole product. It's a pnpm monorepo. See `CONTRIBUTING.md` for the canonical onboarding path.

### Key commands

See `CONTRIBUTING.md` for full details. Quick reference:

- **Install**: `pnpm install` (enforces pnpm via `preinstall` script)
- **Build**: `pnpm build` (builds all packages except examples via tsup)
- **Lint**: `pnpm lint` (prettier)
- **Lint fix (after edits)**: `pnpm lint:fix:fast` (writes formatting repo-wide to match `pnpm lint`; staged-only: `pnpm lint:fix`, also runs via `.husky/pre-commit`)
- **Typecheck**: `pnpm typecheck`
- **Test**: `pnpm test` (builds, then runs ava + vitest suites, including `@flatbread/proof` bounded-loop coverage). For the focused proof loop suite: `pnpm -F @flatbread/proof test`. Vitest packages use `pnpm -F @flatbread/utils exec vitest run` / `pnpm -F @flatbread/codegen exec vitest run` (`run` avoids watch mode).
- **Full verify**: `pnpm verify` (lint + typecheck + build + test)
- **Proof loop contract**: explicit `DAG.loops[].reexecute.tasks` subsets must be dependency-closed, multiple loops must have disjoint re-execution sets, and `DAG.loops` must not be combined with `--converge-on`.
- **Dev server**: `pnpm play` (GraphQL on port 5057, Next.js on port 3000). From `examples/nextjs`, prefer `pnpm exec flatbread start -- next dev --turbopack`. Use `flatbread start` — `flatbread dev` is not a CLI command.

### Mergify Stacks

The repo uses Mergify stacks for PR management. The `mergify-cli` is installed via `pip install mergify-cli` (included in the update script). Key points:

- Use `mergify stack push` instead of `git push` on feature branches (the `.husky/pre-push` hook will remind you).
- The commit-msg hook (`.husky/commit-msg`) auto-appends a `Change-Id` trailer for stack tracking.
- See `.agents/skills/mergify-stack/SKILL.md` for the full workflow.

### Gotchas

- **`@flatbread/proof` requires `CURSOR_RIPGREP_PATH`.** The proof package uses `@cursor/sdk` which expects a bundled ripgrep. In Cloud Agent VMs, set `export CURSOR_RIPGREP_PATH=/usr/bin/rg` to use the system ripgrep (included in the update script).
- **Native build scripts are approved in `pnpm-workspace.yaml`.** The `onlyBuiltDependencies` list allows esbuild, sharp, @swc/core, etc. to run their postinstall scripts automatically during `pnpm install`.
- **Vitest packages run in watch mode by default.** Always use `vitest run` (not bare `vitest`) to get a single run and exit.
- **`flatbread` CLI is not on PATH globally.** From `examples/nextjs`, prefer `pnpm exec flatbread …` (local binary), or `npx flatbread` from a shell. The `pnpm play` script from the root handles this automatically.
- **Build before test.** All packages must be built (`pnpm build`) before running tests or starting dev servers. `pnpm test` handles this automatically.
- **The Next.js example `dev` script uses `--https`.** This requires an SSL certificate. In headless/CI environments, run without `--https`: `pnpm exec flatbread start -- next dev --turbopack`.
- **Full local CI parity check:** `pnpm verify` runs lint, typecheck, build, and all tests.

### Weave merge driver

The repo uses [weave](https://ataraxy-labs.github.io/weave/docs.html) for entity-level semantic merges. The `.gitattributes` file routes supported file types (`.ts`, `.js`, `.json`, `.md`, `.yaml`, etc.) through `weave-driver`, which resolves merges at the function/class/entity level instead of line-by-line.

- **Binaries**: `weave` (CLI) and `weave-driver` (git merge driver), installed via `cargo install --git https://github.com/Ataraxy-Labs/weave weave-cli weave-driver`. The update script handles this.
- **Preview a merge**: `weave preview <branch>` — dry-run that shows which files/entities would merge cleanly or conflict.
- **Config**: `weave setup` was already run; git config `merge.weave.driver` points to `weave-driver`. No re-run needed unless the binary path changes.
- **Rust toolchain**: Weave requires Rust >= 1.89. The update script ensures `rustup default stable` is set.
```

## Source: `packages/proof/README.md`

Category: package-readme

````md
# Proof

Proof is Flatbread's DAG task runner for Cursor agents. It decomposes a task into a graph of subagents, runs each node in topological order, and writes a live `.canvas.tsx` so you can watch the work move from `PENDING` to `RUNNING` to `FINISHED` or `ERROR`.

The package ships as `@flatbread/proof` and exposes:

- `proof`: run a DAG, initialize its canvas, or generate `proof setup` artifacts.
- `proof-supervisor`: run Proof in self-hosting mode so edits to `packages/proof/src/**` can be picked up between ranks.
- Library exports for tooling that wants to author, validate, or inspect DAGs programmatically.

## Quick Start

Build the package once after installing dependencies:

```bash
pnpm -F @flatbread/proof build
```
````

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

## `proof setup`

`proof setup` prepares repo-owned Proof guidance without launching agents by default:

```bash
pnpm exec proof setup
```

Default output lives under `<cwd>/.flatbread/proof/setup/`:

```text
owned-guidelines.bundle.md
owned-guidelines.manifest.json
setup-dag.json
setup-summary.md
```

Behavior:

- Reuses the existing owned-guidelines bundle + manifest when the owned Proof guidance sources are still fresh.
- Regenerates them when Proof guidance sources changed.
- Computes setup gaps and writes a runnable setup DAG + summary, but does not launch agents unless you opt in.
- When the generated DAG does launch agents, it inserts an explicit post-edit refresh step before review; that step rebuilds `@flatbread/proof` and then reruns `proof setup` so runtime edits do not regenerate artifacts through an old packaged CLI.
- Bakes in an explicit maintenance contract: if Proof-related work changes rules, docs, skills, prompts, or runtime behavior, update the owned source files, rebuild `@flatbread/proof`, and rerun `proof setup` so the derived bundle does not become stale.

Opt in to handing the generated DAG to the existing runner:

```bash
pnpm exec proof setup --run-agents --canvas proof-setup
```

The authoritative owned guidance sources currently include `AGENTS.md`, `.cursor/rules/proof-usage-guardrails.mdc`, `packages/proof/README.md`, `.cursor/skills/proof/SKILL.md`, and the legacy `.cursor/skills/dag-task-runner/SKILL.md` compatibility handoff so reruns notice stale redirects too.

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
```

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

Use that skill when a request asks to decompose work, run subagents in parallel, or execute a task as a dependency graph. The legacy `.cursor/skills/dag-task-runner/SKILL.md` entry remains as a compatibility handoff, points to Proof, and is also tracked by `proof setup` as repo-owned guidance.

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
pnpm -F @flatbread/proof build && pnpm exec proof setup
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

````

## Source: `.cursor/skills/proof/SKILL.md`

Category: skill

```md
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

## Repo-specific setup guidance

In this repo, `proof setup` owns the derived Proof guidelines bundle used to keep Proof-specific rules, docs, skills, prompts, and runtime behavior in sync. If Proof-related work changes those authoritative guidance sources or setup/runtime behavior, update them and rerun:

```bash
pnpm -F @flatbread/proof build && pnpm exec proof setup
````

This prevents future Proof DAG prompts from using stale owned-guidelines artifacts or stale packaged setup code.

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

````

## Source: `.cursor/skills/dag-task-runner/SKILL.md`

Category: skill

```md
---
name: dag-task-runner
description: DEPRECATED ALIAS — the DAG task runner has been promoted to the workspace package @flatbread/proof. Use the `proof` skill (.cursor/skills/proof/SKILL.md) for new work; this entry only exists to redirect agents that still reference the old name.
---

# DAG Task Runner — moved to `proof`

This skill has been renamed and promoted from a copy-into-skill bundle to a first-class Flatbread monorepo package.

## What changed

| Before                                                   | After                                        |
| -------------------------------------------------------- | -------------------------------------------- |
| Skill name `dag-task-runner`                             | Skill name `proof`                           |
| Runtime in `.cursor/skills/dag-task-runner/scripts/*.ts` | Runtime in `packages/proof/src/*.ts`         |
| Run via `tsx .cursor/skills/.../run_dag.ts`              | Run via `pnpm exec proof`                    |
| Supervisor `tsx .../run_dag_supervisor.ts`               | Supervisor `pnpm exec proof-supervisor`      |
| Default state dir `.dag-runner/`                         | Default state dir `.proof/`                  |
| Log prefix `[dag-runner]` / `[dag-runner-supervisor]`    | Log prefix `[proof]` / `[proof-supervisor]`  |
| Examples at `.cursor/skills/dag-task-runner/examples/`   | Examples at `.cursor/skills/proof/examples/` |

CLI flag names, the DAG JSON schema, the `.canvas.tsx` shape, oracle / pause / convergence semantics, and the public library API are all unchanged. Existing DAG JSON files and persisted run-state files (move them from `.dag-runner/` to `.proof/` if you want to resume) work as-is.

## What to do

1. Open `.cursor/skills/proof/SKILL.md` for the canonical workflow.
2. Replace any hardcoded `.cursor/skills/dag-task-runner/scripts/run_dag.ts` paths in your prompts / playbooks with the `pnpm exec proof` invocation.
3. If you have an in-flight run with `.dag-runner/run-state.json`, either rename the directory to `.proof/` or pass the old path explicitly via `--state-path`.

## Why

`dag-task-runner` was always a copy-into-project bundle, which meant every project carried its own bit-rotted snapshot of the runtime. Promoting it to `@flatbread/proof` lets the runtime evolve in lockstep with the rest of the Flatbread monorepo (tsup builds, lint, type checks) and gives downstream tooling a stable `import { parseDAG, computeRanks, ... } from '@flatbread/proof'` library surface alongside the CLI.

````
