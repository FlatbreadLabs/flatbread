# Flatbread Oven DAGs

Flatbread-specific DAG JSON for the external Oven CLI
([`@flatbread/oven`](https://github.com/FlatbreadLabs/oven)). These files
belong here, not in the Oven repo: their prompts call monorepo commands such
as `pnpm --filter @flatbread/…` and name Flatbread packages, ports, and agents.

## Layout

- `flatbread/` — workspace orchestration templates
  - `dag-schema-migration.json` — schema-breaking migration (21 tasks)
  - `dag-codegen-change.json` — codegen-focused change
  - `dag-docs-sync.json` — docs/positioning sync
  - `dag-flatbread-flow-pmf-audit.json` — PMF audit flow
  - `dag-funding-research.json` — funding and support programs for Proof
    (15 tasks over 8 ranks; writes `internal/funding/`)
  - `check-funding-report.sh` — the oracle gate `dag-funding-research.json`
    runs last. It checks that the run wrote every file and that the report
    carries every section, then prints `REPORT-SHAPE-OK`.

## Prerequisites

1. Install Oven so `pnpm exec oven` resolves from this repo root, for example:

   ```bash
   pnpm add -Dw @flatbread/oven
   ```

   `@flatbread/oven` is not on the public npm registry. Until it is, clone and
   build it, then call its `bin/oven.js` directly with `--cwd` pointed at this
   repo:

   ```bash
   git clone https://github.com/FlatbreadLabs/oven.git /tmp/oven
   cd /tmp/oven && pnpm install && pnpm build
   ```

2. Set `CURSOR_API_KEY` (or load it from `.env`).

## Run a DAG

From the Flatbread repo root:

```bash
pnpm exec oven --init-only --dag .cursor/dags/flatbread/dag-schema-migration.json
pnpm exec oven --dag .cursor/dags/flatbread/dag-schema-migration.json
```

Replace the DAG path with any file under `flatbread/`. Edit task prompts and
`depends_on` before a real run; `--init-only` confirms the rank shape without
spending model calls.

## Run the funding DAG

`dag-funding-research.json` researches funding and support programs for Proof
and writes `internal/funding/`. Its research lanes make many web requests, so
raise the per-task timeout above the 20-minute default and keep the canvas out
of the working tree:

```bash
node /tmp/oven/bin/oven.js \
  --dag .cursor/dags/flatbread/dag-funding-research.json \
  --cwd "$PWD" \
  --canvas-path /tmp/oven-funding/funding.canvas.tsx \
  --full-output-dir /tmp/oven-funding/artifacts \
  --task-timeout-ms 3600000 \
  --stream-idle-timeout-ms 900000
```

The run ends on the `report-shape-oracle` task, which runs
`check-funding-report.sh`. That gate checks shape, not truth — a passing run can
still hold a stale deadline, so read `internal/funding/research/08-verification.md`
before you trust a date.
