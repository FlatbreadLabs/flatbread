# Changelog

## Unreleased

- The DAG runner is now `@flatbread/oven` (`pnpm exec oven`); the memory package is now `@flatbread/proof` with the `flatbread proof` CLI.
- Proof read envelopes now expose `complete` and `cap_reasons`. Callers can
  tell paging from the `primary_records`, `displayed_edges`, and `bytes` caps
  without parsing the digest Markdown or `summary` text.
- `@flatbread/source-filesystem` reads a content directory that does not exist
  as an empty collection instead of throwing `ENOENT`. Git cannot store an
  empty directory, and a Proof write creates only the directory it writes, so
  a sparse graph was unreadable until every collection directory existed.
  Permission and other I/O faults still fail the read.
  A failing read now also reports through the normal error path: `fetch` no
  longer builds its results in an `async` promise executor, which used to
  leave the caller waiting forever while the failure escaped as an unhandled
  rejection and a raw stack trace.
- **Breaking for writes:** a Proof create mutation now rejects a
  `derives_from` id that no record answers to, with
  `Unknown artifact <id>`. This matches the documented contract for forward
  edges and the existing behavior of `cites`, `supersedes`, and `invalidates`.
  Create the target record first, then link to it.
- `flatbread proof relations` fails with `PROOF_DANGLING_RELATION` (stderr
  JSON, exit 1) when a record stores a `derives_from` id that no record answers
  to. It used to drop the edge and report `page.returned: 0`, which presented
  incomplete provenance as complete. The error names the record, the relation,
  and the missing id. Records written before this release keep any dangling
  edge until you repair the file.

Notes for the Flatbread release train. Some packages also keep their own
changelog; this file covers the repository as a whole.

## 1.0.0

First stable release. The alpha train ended at `flatbread@1.0.0-alpha.22`.

Twelve packages make up the 1.0 release set. They all ship at `1.0.0` and move
in lockstep from here. One version number across the set, so you no longer have
to work out which alpha of one package matches which alpha of another.

Nine were already on npm as alphas and go to `1.0.0` from there:

`flatbread`, `@flatbread/core`, `@flatbread/config`, `@flatbread/codegen`,
`@flatbread/resolver-svimg`, `@flatbread/source-filesystem`,
`@flatbread/transformer-markdown`, `@flatbread/transformer-yaml`, and
`@flatbread/utils`.

Three reach npm for the first time in this release:

- `@flatbread/effort-graph` writes and reads agent memory records.
- `@flatbread/explorer` serves the single-page app for browsing a content graph.
- `@flatbread/proof` runs a task DAG of Cursor subagents.

### Packaging

- Every package declares `engines.node: ">=20.19"`. The old floors were
  `^14.13.1 || >=16.0.0`, `>=18`, and in several packages nothing at all. Node
  18, and Node 20 before 20.19, are no longer supported.
- `@flatbread/config` declares `@flatbread/core` as a runtime dependency. It
  was a devDependency, which worked inside this monorepo and nowhere else.
- `@flatbread/core` no longer emits type declarations a packed install cannot
  resolve. Its `.d.ts` files reached into the private paths
  `graphql/jsutils/Maybe` and `graphql/jsutils/ObjMap`; they now use public
  GraphQL types, and `FlatbreadProvider.query()` declares its return as
  GraphQL's public `ExecutionResult`. `vfile@5.3.4` moves from devDependencies
  to dependencies, because the public types name `VFile`.
- `@flatbread/codegen` widens its peer range on `@flatbread/config` and
  `@flatbread/core` from `workspace:*` to `workspace:^`, so it publishes a
  caret range instead of an exact pin.
- `flatbread` drops five runtime dependencies that no code imported:
  `apollo-server-core`, `apollo-server-express`, `express-graphql`,
  `remark-github`, and `serialize-javascript`. `picomatch` moves to
  devDependencies; only a test uses it. Versions move too: `@apollo/server` to
  5.5.1, the pinned `graphql` to 16.14.2, and `@flatbread/core`'s `lodash-es`
  to 4.18.1.
- `@flatbread/codegen` moves its four GraphQL Code Generator packages (`cli`,
  `typescript`, `typescript-operations`, and `typed-document-node`) onto
  supported major lines, and `@flatbread/config` moves its pinned `esbuild`
  from 0.15.1 to 0.25.0. Nothing you get out changes: the same schema still
  generates byte-identical files.
- `@flatbread/proof` stops shipping `src` and `scripts`, tests and all, in its
  npm tarball. The bins and `dist` still ship, which is all the package needs
  to run.
- `@flatbread/resolver-svimg` points its `repository`, `homepage`, and `bugs`
  links at `FlatbreadLabs/flatbread`. They still named the old
  `tonyketcham/flatbread` fork.
- Every package carries a description that says what that package does.

### Known dependency limits

A clean install of all twelve packages reports seven `npm audit` entries that
npm marks as having no fix available; the main `flatbread` install and its
nine-package set report none, so the two packages below do not affect it.

- `@flatbread/proof` inherits three moderate and high entries from
  `@cursor/sdk`, which depends on `@connectrpc/connect-node@1.x` and through it
  `undici@5.x`. No current or later `@cursor/sdk` release clears them, and the
  later releases require Node 22.13 or newer.
- `@flatbread/resolver-svimg` inherits four high entries from its required peer
  `svimg`, which depends on `sharp`. The latest `svimg@4` still pins `sharp`
  below the patched 0.35 line, and it changes the import API this resolver
  uses.

### Docs

- The READMEs and `docs/positioning.md` now lead with the Effort Graph: an
  agent's Efforts, Issues, Findings, Decisions, Constraints, Risks, Citations,
  and Blobs written as Markdown records in your repository. The reasoning gets
  committed and reviewed like the code.
- Relational content for sites, docs, and internal tools stays a first-class
  second path on the same engine, and GraphQL is described as one read
  interface over the graph rather than as the product.
- Removed the banner that called the whole project experimental. The narrower
  qualifiers still hold: the generated TypeScript read API is a prototype, and
  its selection-string escape hatch is experimental.
- The `@flatbread/effort-graph` README no longer claims Git ignores the journal
  for you. It names the default `.flatbread-efforts` root, lists the two
  `.gitignore` lines you must add, and points at
  `flatbread effort bootstrap --verify`, which exits nonzero when setup is
  incomplete.

There is no migration guide. Of the changes above, the Node floor is the one
that can break an install. For anything else that moved since
`1.0.0-alpha.22`, read the Git history; the alpha train did not keep
per-release notes.
