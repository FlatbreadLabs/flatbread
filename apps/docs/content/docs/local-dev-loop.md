---
id: local-dev-loop
title: Local dev loop
section: guides
order: 1
summary: What `flatbread start --watch` picks up, what it does not, and where the four moving parts hand off to each other.
related:
  - edit-file-see-query-update-demo
---

# Local dev loop and watch boundaries

**Next action: start the unified watcher with the five steps below.**

The first run takes about 5–10 minutes on a typical laptop. Later starts take
about 30 seconds when dependencies and packages are already built.

## Start the Next.js loop

1. From the repository root, install dependencies:

   ```bash
   pnpm install
   ```

2. Build the workspace packages:

   ```bash
   pnpm build
   ```

3. Enter the example app:

   ```bash
   cd examples/nextjs
   ```

4. Generate the initial TypeScript artifacts:

   ```bash
   pnpm exec flatbread codegen --verbose
   ```

5. Start Flatbread and Next.js together:

   ```bash
   pnpm exec flatbread start --watch -- next dev --turbopack
   ```

Success: GraphQL is available at `http://localhost:5057/graphql`, Next.js is
available on port `3000`, and one watcher owns later regeneration. The example
package's `pnpm dev` script runs the same start command.

## The four moving parts

1. **Loader reload** — source plugins read files from configured content paths.
2. **Schema rebuild** — `@flatbread/core` validates IDs and refs, then builds
   the GraphQL schema.
3. **Codegen refresh** — the watcher regenerates TypeScript after config,
   content, or GraphQL document changes.
4. **Framework refresh** — `flatbread start -- <framework command>` runs the
   GraphQL server beside the app command.

Expected behavior:

- One unified watcher owns config/content/document classification, GraphQL
  hot-swaps, and generated artifact refreshes.
- Editing a `.graphql` document or a content/config file refreshes
  `generated/graphql.ts`; do not run `flatbread codegen --watch` beside it.
- The generated content-model types and prototype read API are refreshed by
  the same codegen command.
- The running GraphQL endpoint at `http://localhost:5057/graphql` hot-swaps
  valid content and config generations without restarting the framework.

## Content and config changes

| Change                                  | Flatbread action                                                               | Framework action                             | Your action                 |
| --------------------------------------- | ------------------------------------------------------------------------------ | -------------------------------------------- | --------------------------- |
| Markdown/YAML field value               | Reindexes, validates, hot-swaps the graph, then refreshes codegen              | Uses its own dev-server refresh behavior     | Refresh the page or request |
| New/removed content file                | Reindexes, validates, hot-swaps the graph, then refreshes codegen              | Uses its own dev-server refresh behavior     | Refresh the page or request |
| `flatbread.config.*` content/ref change | Reloads config and matchers, validates, hot-swaps the graph, then runs codegen | Keeps running; Flatbread does not restart it | Refresh the page or request |

## Documents, package code, and generated files

| Change                          | Flatbread action                                                | Framework action                                 | Your action                                       |
| ------------------------------- | --------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------- |
| `.graphql` document             | Refreshes codegen; the GraphQL server stays running             | Normally recompiles code that imports the output | No Flatbread restart; refresh the page or request |
| Transformer/source package code | Keeps using the previously built package code                   | May keep using the previously built package code | Rebuild the package, rerun codegen, and restart   |
| `generated/graphql.ts`          | Treats it as generated output; the GraphQL server stays running | Normally recompiles code that imports the file   | No Flatbread restart                              |

## Failure semantics today

- Rejected config, content, or codegen phases log an error and keep the watcher
  alive. Generated files stay unchanged until a later successful run.
- One-shot `flatbread codegen` errors exit non-zero. They do not prove that a
  live server changed.
- Unified watch mode rejects an invalid graph atomically. Generated artifacts
  and the server stay on the previous valid graph; a restart reports the bad
  input during startup.
- A codegen failure does not undo an already committed GraphQL generation.
  Edits received during that generation run in the next serialized batch.

## How watch mode works

After the start command succeeds, watch mode does the following:

1. A single coordinator classifies config, content, and document events, then
   serializes all rebuild and codegen phases.
2. Content changes reindex records and atomically hot-swap the GraphQL schema
   before refreshing generated TypeScript.
3. Config changes reload the config and matchers, rebuild and atomically
   hot-swap the schema, then refresh generated TypeScript.
4. GraphQL document changes refresh generated TypeScript without reindexing
   content.

## Limits you must act on

- Watch mode is a long-running process; do not use it in CI or one-shot
  scripts.
- Watch mode requires a source plugin with `fetchPaths`; sources without it fail
  fast at startup.
- `flatbread.config.*` watching is relative to the `flatbread start` cwd.
- Port `5057` collisions are not resolved automatically; stop the old
  Flatbread process before starting another server.

## Platform boundaries

- Flatbread serves plain HTTP. The `-H, --https` flag does not change how it
  listens, so the GraphQL endpoint stays on HTTP port `5057`.
- Flatbread does not rebuild transformer or source package code.
- Flatbread keeps the framework process running. The framework controls its own
  recompilation and page refresh.

Next: keep the watcher running and
[open GraphQL](http://localhost:5057/graphql).
