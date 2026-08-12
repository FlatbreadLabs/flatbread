---
name: flatbread-major-migration
description: Guide schema-breaking Flatbread migrations across core schema generation, resolver arguments, generated TypeScript, CLI behavior, examples, docs, and coordinated monorepo releases. Use when a change may alter IDs, refs, filters, root query names, generated types, config shape, publish scripts, or example app behavior.
---

# Flatbread Major Migration

Use this skill for schema-breaking or developer-contract changes in Flatbread.

## Non-Negotiable Framing

Flatbread is a Git-native relational content layer for TypeScript apps. Keep GraphQL as one supported interface, not the whole product identity. Do not reposition Flatbread as a general flat-file database unless writes, constraints, migrations, import/export, and release guarantees are deliberately in scope.

## Phase 1: Read-Only Diagnosis

Before editing, inspect:

- `flatbread.config.*` and content model definitions.
- `packages/core/src/generators/schema.ts`.
- `packages/core/src/resolvers/arguments.ts`.
- `packages/core/src/types.ts`.
- `packages/flatbread/src/cli/index.ts`.
- `packages/codegen`.
- `examples/nextjs`, generated GraphQL documents/types, and README examples.

Write a before/after contract covering IDs, refs, filters, root query names, generated TypeScript, config shape, CLI behavior, and example behavior.

## Phase 2: Migration Plan

State:

- Packages that must change together.
- Tests, snapshots, generated output, examples, and docs to update.
- Compatibility policy: preserve shipped contracts unless a breaking migration is approved.
- Migration notes users need.
- Rollback path.

Escalate to a human before implementation if any public or generated contract changes.

## Phase 3: Implementation

Implement only the approved contract. Keep shared schema and resolver changes aligned with codegen, CLI, examples, and docs. Prefer explicit diagnostics for invalid content models, missing refs, duplicate IDs, unsupported relation shapes, and confusing filter behavior.

## Phase 4: Validation

Run or document the closest available checks:

- Core schema/resolver tests or snapshots.
- `packages/codegen` generation tests.
- CLI codegen and server behavior.
- `examples/nextjs` generated GraphQL artifacts and build behavior.
- README and package README snippets.

If a check cannot run, explain why and record the residual risk.

## Release Gate

Treat breaking work as a coordinated monorepo release across `flatbread`, `@flatbread/core`, `@flatbread/config`, `@flatbread/codegen`, source/transformer packages, and examples.

- For prereleases, use an explicit train such as `1.0.0-alpha.N` or `1.0.0-beta.N`.
- Do not publish breaking prereleases as accidental `latest`.
- Add migration docs before release approval.
- Confirm rollback and package coordination before publishing.

## Default DAG Shape

When this skill is run under the external Oven CLI (`@flatbread/oven` from https://github.com/FlatbreadLabs/oven), use the topology in `flatbread-flow-agentic-workflows.md` ("DAG Topology" section). The canonical schema-migration shape — express the DAG via `depends_on` only; the runner computes ranks via Kahn topo-sort. The shape below is what `pnpm exec oven --init-only` produces for the starter template (21 tasks across 7 ranks):

```
rank 1  diag-schema, diag-resolvers, diag-types, diag-codegen, diag-cli,
        diag-examples, diag-docs, diag-transformers, diag-source-plugins,
        diag-config                                                 (planner; read-only)
rank 2  contract-synth                                              (planner; merge)
        — Human Checkpoint 1 — schema contract approval —
rank 3  impl-core, impl-docs                                        (executor; depends_on contract-synth)
rank 4  impl-codegen, impl-cli, verify-schema-snap, verify-readme   (executor + reviewer; depends_on impl-core / impl-docs)
rank 5  impl-examples, verify-codegen                               (executor + reviewer; depends_on impl-codegen)
rank 6  verify-cli                                                  (reviewer; binds port 5057, depends_on impl-cli + verify-codegen)
rank 7  browser-verify                                              (browser-verifier; binds port 5057, depends_on impl-examples + verify-cli)
```

Two ranks bind port `5057` (`verify-cli`, `browser-verify`); they must remain on distinct ranks. A starter JSON lives at `.cursor/dags/flatbread/dag-schema-migration.json`. Edit task contents and `depends_on`, then re-run `--init-only` to confirm the rank shape didn't regress. See `.cursor/dags/README.md` for how to install and run Oven against these DAGs.

### Safe parallel cuts

Same-rank-safe (do not write the same files):

- All read-only diagnosis tasks.
- `packages/transformer-*` that don't extend shared core types.
- `docs/`, `README.md`, package READMEs, migration notes, changelog.
- All validation tasks (each owns a different command).

Must serialize (`depends_on` chain, never share a rank):

- `schema.ts` → `arguments.ts` → `types.ts` inside `packages/core`.
- `packages/core` → `packages/codegen`.
- `packages/codegen` → `examples/nextjs/**/generated*`.
- Any task running `flatbread start` against port `5057`.

### DAG handoff requirements

- Every task prompt must start with `You are acting as <agent-name>. Follow its responsibilities and output schema.` AND paste the agent's `## Output Schema For DAG Handoff` heading list verbatim. The runner only forwards `apiKey`/`model`/`cwd` to `Agent.create` (`run_dag.ts:482-486`), so `.cursor/agents/*` system prompts do not propagate.
- The PMF framing line is mandatory only for tasks that touch positioning, README, docs, examples, or roadmap. Strip it from pure mechanical tasks (`diag-schema`, `diag-resolvers`, `diag-types`, `impl-codegen`, `verify-codegen`, etc.) — every line costs tokens in every prompt.
- For tasks that need to "stay in scope", add a one-liner reminder that `readonly: true` and `tools:` frontmatter are advisory; reinforce `Do not edit files.` in the prompt body.
- Subagent output must lead with the agent's `## Output Schema For DAG Handoff` headings. Group multi-file references (e.g. `packages/core/src/{generators,resolvers,types}.ts`) so the executor's `## Files changed` survives the 1800-char window.
