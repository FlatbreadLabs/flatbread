# @flatbread/codegen

## 1.0.0

First stable release, published in lockstep with the rest of Flatbread at
`1.0.0`.

- Requires Node 20.19 or newer (`engines.node: ">=20.19"`).
- The peer range on `@flatbread/config` and `@flatbread/core` moves from
  `workspace:*` to `workspace:^`, so the published package asks for a caret
  range instead of an exact version.
- Besides GraphQL schema and operation types, the generated file now contains a
  prototype TypeScript read API, `createFlatbreadReadApi()`, built from your
  configured collections, fields, and refs. It runs its reads through the
  GraphQL layer, and its selection-string escape hatch is experimental.

Current defaults:

- Output: `./generated/graphql.ts`
- Plugins: `typescript`, `typescript-operations`, `typed-document-node`, or
  pick a `preset` of `basic`, `operations`, or `full`
- Caching: on
- Schema: deprecated fields included, introspection excluded

CLI:

```bash
flatbread codegen                 # generate once
flatbread codegen --watch         # regenerate when files change
flatbread codegen --clear-cache   # force a full regeneration
flatbread codegen --verbose       # log what it is doing
```

Versions between `1.0.0-alpha.1` and `1.0.0` were part of the alpha train and
have no separate notes.

## 1.0.0-alpha.1

Initial release.

- Generates TypeScript from a Flatbread GraphQL schema with
  [GraphQL Code Generator](https://www.the-guild.dev/graphql/codegen).
- Adds the `flatbread codegen` command, including `--watch`, `--clear-cache`,
  and `--verbose`.
- Skips regeneration when nothing changed, comparing SHA256 hashes of the
  config, schema, and documents.
- Exposes `generateTypes()`, `generateTypesWithDocuments()`,
  `watchAndGenerate()`, `hashCodegenInputs()`, `loadCache()`, and `saveCache()`.
- Reads its settings from the `codegen` key in `flatbread.config.*`.
