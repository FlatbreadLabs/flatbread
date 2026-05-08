# Local dev loop and watch boundaries

Flatbread's local loop has four moving parts:

1. **Loader reload** — source plugins read flat files from the configured
   content paths.
2. **Schema rebuild** — `@flatbread/core` turns loaded records and refs into a
   GraphQL schema after ID/ref validation.
3. **Codegen refresh** — `flatbread codegen --watch` regenerates TypeScript
   artifacts when config, content, or GraphQL documents change.
4. **Framework restart / refresh** — `flatbread start -- <framework command>`
   runs the GraphQL server beside your app command.

Today these pieces are partly automated. Codegen has a watch loop; the
GraphQL server started by `flatbread start` still builds its schema at process
startup. That means some edits update generated TypeScript automatically, while
runtime query behavior still needs a restart until the server grows a live
schema swap.

## Canonical Next.js happy path

From the repo root:

```bash
pnpm install
pnpm build
cd examples/nextjs
pnpm exec flatbread codegen --verbose
```

For development, use two terminals. This path avoids the example package's
HTTPS convenience script and keeps the Flatbread GraphQL endpoint on plain HTTP
port `5057`.

```bash
# terminal 1 — regenerate TypeScript artifacts
pnpm exec flatbread codegen --watch --verbose
```

```bash
# terminal 2 — serve GraphQL + Next.js without HTTPS for headless/dev agents
pnpm exec flatbread start -- next dev --turbopack
```

Expected behavior:

- Editing a `.graphql` document or a content/config file triggers the codegen
  watcher and updates `generated/graphql.ts`.
- The generated content-model types and prototype read API are refreshed by
  the same codegen command.
- The running GraphQL endpoint at `http://localhost:5057/graphql` continues to
  use the schema it built at startup.
- Restart `pnpm exec flatbread start -- next dev --turbopack` after changing
  content, refs, collection config, transformers, or validation-sensitive data
  if you need the live endpoint/app render to reflect the new graph.

## Current reload matrix

| Change                                  | Codegen watcher behavior                    | Running GraphQL server                           | Framework app                                            | Action required today                                    |
| --------------------------------------- | ------------------------------------------- | ------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------- |
| Markdown/YAML field value               | Regenerates if watched path matches         | Keeps previous startup schema/data               | Keeps rendering whatever the endpoint returns            | Restart `flatbread start` to update live query results   |
| New/removed content file                | Regenerates if watched path matches         | Keeps previous startup schema/data               | Keeps rendering whatever the endpoint returns            | Restart `flatbread start` to update live query results   |
| `.graphql` document                     | Regenerates operation types                 | No restart unless query text used by app changed | Framework dev server normally recompiles importing files | No Flatbread restart unless app code needs it            |
| `flatbread.config.*` content/ref change | Attempts config reload from the current cwd | Keeps previous startup schema/data               | Keeps rendering whatever the endpoint returns            | Restart `flatbread start`; run watcher from config dir   |
| Transformer/source package code         | Does not rebuild package code               | Keeps previous imported package code             | May keep previous imported package code                  | Rebuild/watch package separately, rerun codegen, restart |
| `generated/graphql.ts`                  | Output of codegen                           | No direct effect                                 | Framework dev server recompiles imports                  | No Flatbread restart                                     |

## Failure semantics today

- If content becomes invalid while `flatbread codegen --watch` is running, the
  watcher logs the validation/codegen error and keeps watching. Existing
  generated files are left as-is until a later successful regeneration.
- In one-shot mode (`flatbread codegen` without `--watch`), validation or
  codegen errors exit non-zero and do not prove the live server changed.
- If the running GraphQL server was started before the invalid edit, it keeps
  serving the schema/data it already loaded. Restarting it surfaces the
  validation error at startup.
- There is no partial hot-swap mode yet: generated TypeScript can refresh while
  the live GraphQL server remains on the old content graph.

## Draft unified watch design (not implemented)

The unified loop should eventually make this one command:

```bash
flatbread start --watch -- next dev --turbopack
```

Design contract:

1. Watch the same content/config/document paths that `flatbread codegen --watch`
   already derives from `LoadedFlatbreadConfig`.
2. On content changes, reload records, rerun ID/ref/cardinality validation,
   rebuild the schema, refresh generated TypeScript, and swap the GraphQL
   server schema only if the new graph validates. If validation fails, keep the
   previous schema active and log the failure.
3. On config changes, reload config, rebuild watch globs, rebuild schema,
   refresh generated TypeScript, and restart only the Flatbread GraphQL server
   boundary if a safe hot swap is not possible. A safe hot swap means replacing
   schema/data without losing the child framework process, open port, or
   in-flight request handling state.
4. On GraphQL document changes, refresh generated TypeScript only.
5. Keep framework restarts explicit. Flatbread should not assume every
   framework can be restarted safely; it should document whether the app command
   is left running, restarted, or expected to recompile through its own dev
   server.

## Known limitations

- `flatbread start` does **not** currently hot-swap schema or content.
- `flatbread codegen --watch` is a long-running process; do not use it in CI or
  one-shot scripts.
- The Next.js example `pnpm dev` includes `--https` for local convenience, but
  the Flatbread GraphQL endpoint remains documented as HTTP on `5057`. In
  headless environments prefer `pnpm exec flatbread start -- next dev --turbopack`.
- Generated TypeScript can update before the running GraphQL endpoint does.
  Treat codegen success as a type artifact refresh, not proof that the live
  server has reloaded.
- `flatbread.config.*` watching is relative to the process cwd today. Run
  `flatbread codegen --watch` from the directory that contains the config.
- Port `5057` collisions are not resolved automatically; stop the old
  Flatbread process before starting another server.

## Follow-up implementation seams

- Add a `flatbread start --watch` flag that composes schema reload and codegen
  refresh.
- Factor codegen's watch-pattern derivation into a shared helper used by both
  `@flatbread/codegen` and the CLI.
- Add an integration test that edits a fixture post and proves the GraphQL
  endpoint returns the updated value without a manual restart once hot swap is
  implemented.
- Add a current-behavior integration test that edits a fixture post and proves
  the running server does **not** change until restart, so future hot-swap work
  has a concrete test to flip.
