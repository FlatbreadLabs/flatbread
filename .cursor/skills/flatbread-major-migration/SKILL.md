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
