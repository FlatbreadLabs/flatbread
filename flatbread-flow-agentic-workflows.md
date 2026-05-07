# Flatbread Flow Agentic Workflows

This playbook turns `flatbread-flow-pmf-audit.md` into an execution workflow for agents working on Flatbread. Use it when planning or implementing product changes that affect the relational content model, GraphQL schema, generated TypeScript, CLI, examples, docs, or release process.

## Product Direction

Keep the product framed as:

> Git-native relational content for TypeScript apps, backed by flat files, with GraphQL and generated types when teams want them.

Use this framing to resolve scope questions:

- Lead with local flat-file content, relations, type safety, validation, and a fast edit/query loop.
- Treat GraphQL as an important interface, not the entire product identity.
- Avoid database-replacement claims until writes, constraints, migrations, import/export, and operational guarantees exist.
- Prefer improvements that make `posts -> authors -> tags` easy to model, validate, query, and type.

## Execution Model

Work in four phases. Do not skip the contract and validation phases for schema or API changes.

### Phase 1: Read-Only Diagnosis

Inspect the current behavior before changing files:

- `flatbread.config.*` and content model definitions.
- `packages/core/src/generators/schema.ts`, `packages/core/src/resolvers/arguments.ts`, and `packages/core/src/types.ts`.
- `packages/flatbread/src/cli/index.ts` and GraphQL server wiring.
- `packages/codegen` schema/document/type generation.
- `examples/nextjs`, generated GraphQL artifacts, and example GraphQL documents.
- README examples and positioning language.

Diagnosis output should state:

- Current contract: IDs, refs, filters, root query names, generated type names, config shape, and CLI behavior.
- Proposed contract: what changes, what stays stable, and what becomes deprecated or removed.
- Migration impact: affected packages, examples, docs, generated output, release notes, and rollback path.

### Phase 2: Architecture Plan

Before implementation, write a short plan that answers:

- Does this strengthen Git-native relational content, or drift toward a general flat-file database?
- Which public contracts change?
- Which runtime contracts change internally because filters or resolvers depend on GraphQL behavior?
- Which packages need coordinated changes?
- Which tests, snapshots, examples, and docs prove the new contract?

Escalate to a human before proceeding when the change alters IDs, refs, filters, query names, generated TypeScript, config shape, publish scripts, or example app behavior.

### Phase 3: Implementation

Keep implementation scoped to the approved contract.

- Change shared schema/types before downstream CLI, codegen, examples, and docs.
- Prefer explicit validation and diagnostics over permissive fallbacks.
- Preserve shipped user-facing behavior unless the plan explicitly approves a breaking migration.
- Replace unshipped branch behavior directly rather than layering compatibility shims around it.
- Update examples and README snippets in the same change when developer-facing APIs change.

### Phase 4: Validation And Release Gate

Schema-breaking work is blocked until all relevant checks are accounted for:

- GraphQL schema snapshots or equivalent before/after inspection.
- Generated TypeScript output for `packages/codegen` and `examples/nextjs`.
- CLI codegen and server behavior, including `flatbread start`, `/graphql`, and port `5057` where applicable.
- Example app behavior for Next.js and any touched framework example, preferably verified with `pnpm exec agent-browser`.
- README and package README examples.
- Version train across `flatbread`, `@flatbread/core`, `@flatbread/config`, `@flatbread/codegen`, transformers, and examples.
- Dist-tag strategy for prereleases; do not accidentally publish breaking prereleases as `latest`.
- Migration docs and rollback notes.

## Suggested Agent Flow

Use focused agents when the task is large enough to benefit from separation:

- `flatbread-architecture-planner`: read-only contract diagnosis and implementation plan.
- `flatbread-adversarial-reviewer`: review planned or completed changes for regressions and missing validation.
- `flatbread-migration-executor`: implement approved migration steps only after a contract exists.
- `flatbread-browser-verifier`: verify examples and dev loop behavior from a user-facing browser perspective using the repo-pinned `agent-browser` CLI.

For schema-breaking work, use the `flatbread-major-migration` project skill and follow its checkpoints.

## Human Checkpoints

Checkpoint 1: Schema Contract

- Required before editing `packages/core/src/generators/schema.ts`, `packages/core/src/resolvers/arguments.ts`, or `packages/core/src/types.ts`.
- Must include before/after contract and migration impact.

Checkpoint 2: DevEx Validation

- Required before considering implementation complete.
- Must include CLI, codegen, examples, generated GraphQL documents/types, and README examples.

Checkpoint 3: Release Approval

- Required before release work.
- Must include version strategy, migration docs, package coordination, dist-tag behavior, and rollback path.
