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
