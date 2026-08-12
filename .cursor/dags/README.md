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

## Prerequisites

1. Install Oven so `pnpm exec oven` resolves from this repo root, for example:

   ```bash
   pnpm add -Dw @flatbread/oven
   ```

   Or install from the Oven repository if the package is not on the registry
   you use yet.

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
