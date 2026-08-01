# Flatbread Proof DAGs

Flatbread-specific DAG JSON for the external Proof CLI
([`@flatbread/proof`](https://github.com/FlatbreadLabs/proof)). These files
belong here, not in the Proof repo: their prompts call monorepo commands such
as `pnpm --filter @flatbread/…` and name Flatbread packages, ports, and agents.

## Layout

- `flatbread/` — workspace orchestration templates
  - `dag-schema-migration.json` — schema-breaking migration (21 tasks)
  - `dag-codegen-change.json` — codegen-focused change
  - `dag-docs-sync.json` — docs/positioning sync
  - `dag-flatbread-flow-pmf-audit.json` — PMF audit flow

## Prerequisites

1. Install Proof so `pnpm exec proof` resolves from this repo root, for example:

   ```bash
   pnpm add -Dw @flatbread/proof
   ```

   Or install from the Proof repository if the package is not on the registry
   you use yet.

2. Set `CURSOR_API_KEY` (or load it from `.env`).

## Run a DAG

From the Flatbread repo root:

```bash
pnpm exec proof --init-only --dag .cursor/dags/flatbread/dag-schema-migration.json
pnpm exec proof --dag .cursor/dags/flatbread/dag-schema-migration.json
```

Replace the DAG path with any file under `flatbread/`. Edit task prompts and
`depends_on` before a real run; `--init-only` confirms the rank shape without
spending model calls.
