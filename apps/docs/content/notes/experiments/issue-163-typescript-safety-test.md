# Experiment: Issue #163 — TypeScript safety interview/test

## Question

Do generated Flatbread types and the prototype TypeScript read API make
posts/authors/tags consumption materially safer than untyped flat-file reads or
hand-written GraphQL strings?

## Test surface

Representative files:

- `examples/nextjs/generated/graphql.ts`
- `examples/nextjs/lib/read.ts`
- `packages/codegen/src/__tests__/e2e.test.ts`
- `packages/core/src/types.test.ts`

## What works

- `FlatbreadCollectionName` narrows collection names to configured literals.
- `FlatbreadRecord<'Post'>` ties app code to generated record shape.
- `FlatbreadRelationTarget<'Post', 'authors'>` ties relation traversal to the
  configured `refs` target and cardinality.
- `tags` on `Post` remains a string facet (`Post['tags']`), not a relation
  helper, because the canonical example does not model `Tag` as a collection.
- `FlatbreadRelationCardinality<'Post', 'authors'>` exposes whether a relation
  is one or many.
- `createFlatbreadReadApi()` lets the app read `Post` and `Author` through a
  generated collection-shaped API while GraphQL remains the underlying
  execution layer.
- Core content/plugin types now use `unknown`, typed `ContentEntry.refs`, and
  typed `Source.fetch` inputs instead of broad `any` surfaces.

## Type-safety test run

Commands:

```bash
pnpm --filter @flatbread/codegen build
pnpm -F @flatbread/codegen exec vitest run
pnpm --filter @flatbread/core build
pnpm test:ava -- --match='*content types*'
pnpm --filter nextjs build
```

Observed results in this workspace:

```text
@flatbread/codegen build: passed
@flatbread/codegen vitest: 39 tests passed
@flatbread/core build: passed
AVA content type assertions: passed (the command currently runs the broader AVA suite)
Next.js build: passed, with known eslint-plugin-react-hooks warning
```

## Inference gaps and confusing names

- `createFlatbreadReadApi()` still accepts an optional GraphQL selection string
  for advanced use. That selection is not type-checked, so the safest path is
  the generated default selection.
- `FlatbreadReadApi` returns `Partial<FlatbreadRecord<C>>` because the selected
  fields are a runtime concern. This is honest, but less precise than a typed
  selection builder would be.
- Generated relation helper names are verbose:
  `FlatbreadRelationTargetCollection` versus `FlatbreadRelationTarget` can be
  confusing without examples.
- Nullable GraphQL results and generated helper types are not yet perfectly
  aligned. The prototype errs toward safe optional/partial reads.
- Flatbread metadata fields such as `_path` and `_slug` are still emitted as
  nullable by GraphQL Code Generator even when Flatbread-managed records usually
  provide them.
- Core plugin author types are narrower, but `ContentEntry` still permits
  arbitrary extra keys for plugin/config extensibility.

## Verification transcript

```text
pnpm --filter @flatbread/codegen build
exit 0

pnpm -F @flatbread/codegen exec vitest run
Test Files  5 passed (5)
Tests       39 passed (39)

pnpm --filter @flatbread/core build
exit 0

pnpm test:ava -- --match='*content types*'
exit 0
73 tests passed
note: the match command currently runs the broader AVA suite because of the root script's argument forwarding

pnpm --filter nextjs build
exit 0
note: build succeeds but prints the known eslint-plugin-react-hooks warning

pnpm lint
exit 0
All matched files use Prettier code style!
```

## Follow-up issue drafts

### Follow-up: Add typed selection builder for generated read API

**Problem:** Selection strings are runtime GraphQL snippets, not typed
TypeScript selections.

**Acceptance criteria:**

- Generate a selection builder or typed projection API for collection reads.
- Compile-time tests reject unknown fields.
- Existing string selection remains documented as an escape hatch or is removed.

### Follow-up: Tighten relation helper naming and examples

**Problem:** `FlatbreadRelationTarget` and
`FlatbreadRelationTargetCollection` are useful but easy to confuse.

**Acceptance criteria:**

- Add generated JSDoc explaining each helper.
- Add examples for one-to-one and one-to-many relations.
- Ensure docs and generated names match the glossary.

### Follow-up: Align nullability between GraphQL and read helper types

**Problem:** GraphQL nullable list/member behavior is only approximately
represented by the read helper types.

**Acceptance criteria:**

- Derive nullability from the GraphQL schema for relation helpers.
- Add compile-time assertions for nullable singular, nullable list, and
  non-null list relations.

## Decision

**Keep / iterate.** Type safety is a PMF-strengthening differentiator. The
generated content-model helpers and read API remove several weakly typed paths,
but the prototype still needs a typed selection story and sharper relation
helper documentation before it can be marketed as a fully type-safe read layer.
