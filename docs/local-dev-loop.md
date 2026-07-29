# Local dev loop and watch boundaries

Flatbread's local loop has four moving parts:

1. **Loader reload** — source plugins read flat files from the configured
   content paths.
2. **Schema rebuild** — `@flatbread/core` turns loaded records and refs into a
   GraphQL schema after ID/ref validation.
3. **Codegen refresh** — the unified watcher regenerates TypeScript artifacts
   when config, content, or GraphQL documents change.
4. **Framework restart / refresh** — `flatbread start -- <framework command>`
   runs the GraphQL server beside your app command.

Today these pieces are automated by `flatbread start --watch`: content edits
incrementally reindex and hot-swap the GraphQL schema, config edits rebuild the
schema and watcher matchers, and document edits refresh codegen.

## Canonical Next.js happy path

From the repo root:

```bash
pnpm install
pnpm build
cd examples/nextjs
pnpm exec flatbread codegen --verbose
```

For development, use the unified watcher. It serves GraphQL on port `5057`,
refreshes generated artifacts, and runs Next.js. The example package's
`pnpm dev` script runs the same command.

```bash
pnpm exec flatbread start --watch -- next dev --turbopack
```

Expected behavior:

- One unified watcher owns config/content/document classification, GraphQL
  hot-swaps, and generated artifact refreshes.
- Editing a `.graphql` document or a content/config file refreshes
  `generated/graphql.ts`; do not run `flatbread codegen --watch` beside it.
- The generated content-model types and prototype read API are refreshed by
  the same codegen command.
- The running GraphQL endpoint at `http://localhost:5057/graphql` hot-swaps
  valid content and config generations without restarting the framework.

## Current reload matrix

| Change                                  | Unified watcher behavior                                                       | Running GraphQL server                           | Framework app                                            | Action required today                                    |
| --------------------------------------- | ------------------------------------------------------------------------------ | ------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------- |
| Markdown/YAML field value               | Atomically reindexes/hot-swaps, then refreshes codegen                         | Hot-swaps after validation                       | Keeps rendering whatever the endpoint returns            | None; framework refresh remains explicit                 |
| New/removed content file                | Atomically reindexes/hot-swaps, then refreshes codegen                         | Hot-swaps after validation                       | Keeps rendering whatever the endpoint returns            | None; framework refresh remains explicit                 |
| `.graphql` document                     | Refreshes codegen only                                                         | No restart unless query text used by app changed | Framework dev server normally recompiles importing files | No Flatbread restart unless app code needs it            |
| `flatbread.config.*` content/ref change | Reloads config/matchers, atomically rebuilds/hot-swaps, then refreshes codegen | Rebuilds and hot-swaps after validation          | Keeps rendering whatever the endpoint returns            | None; framework refresh remains explicit                 |
| Transformer/source package code         | Does not rebuild package code                                                  | Keeps previous imported package code             | May keep previous imported package code                  | Rebuild/watch package separately, rerun codegen, restart |
| `generated/graphql.ts`                  | Output of codegen                                                              | No direct effect                                 | Framework dev server recompiles imports                  | No Flatbread restart                                     |

## Failure semantics today

- Rejected config, content, or codegen phases are logged and keep the unified
  watch loop alive. Existing generated files are left as-is until a later
  successful regeneration.
- In one-shot mode (`flatbread codegen` without `--watch`), validation or
  codegen errors exit non-zero and do not prove the live server changed.
- If the running GraphQL server was started before the invalid edit, it keeps
  serving the schema/data it already loaded. Restarting it surfaces the
  validation error at startup.
- In unified watch mode, invalid candidates are rejected atomically: generated
  artifacts and the live GraphQL server remain on the previous committed graph.
  A codegen failure does not undo an already committed GraphQL generation, and
  edits received during an in-flight generation are queued for the next
  serialized batch.

## How watch mode works

The unified loop is started with:

```bash
pnpm exec flatbread start --watch -- next dev --turbopack
```

Watch mode does the following:

1. A single coordinator classifies config, content, and document events, then
   serializes all rebuild and codegen phases.
2. Content changes reindex records and atomically hot-swap the GraphQL schema
   before refreshing generated TypeScript.
3. Config changes reload the config and matchers, rebuild and atomically
   hot-swap the schema, then refresh generated TypeScript.
4. GraphQL document changes refresh generated TypeScript without reindexing
   content.
5. Rejected phases emit an error but do not stop the loop. Committed GraphQL
   generations are not rolled back when a later codegen phase fails.
6. Events received during an in-flight generation are queued and processed
   serially.
7. Framework restarts remain explicit. Flatbread keeps the framework child
   process running and relies on its own dev server to recompile or refresh.

## Known limitations

- `flatbread start --watch` replaces the running schema after a valid content
  or config change. If a change is invalid, it keeps the previous schema.
- Watch mode is a long-running process; do not use it in CI or one-shot
  scripts.
- Flatbread serves plain HTTP. The `-H, --https` flag does not change how it
  listens, so the GraphQL endpoint is always HTTP on `5057`.
- Codegen failures are logged and do not undo a committed schema generation.
- Watch mode requires a source plugin with `fetchPaths`; sources without it fail
  fast at startup.
- `flatbread.config.*` watching is relative to the `flatbread start` cwd.
- Port `5057` collisions are not resolved automatically; stop the old
  Flatbread process before starting another server.

Flatbread keeps the framework process running. It does not restart the
framework or control how the framework refreshes its pages.
