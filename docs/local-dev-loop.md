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

For development, use two terminals. This path avoids the example package's
HTTPS convenience script and keeps the Flatbread GraphQL endpoint on plain HTTP
port `5057`.

```bash
# terminal 1 — regenerate TypeScript artifacts
pnpm exec flatbread codegen --watch --verbose
```

```bash
# terminal 2 — serve GraphQL + Next.js without HTTPS for headless/dev agents
pnpm exec flatbread start --watch -- next dev --turbopack
```

Expected behavior:

- Editing a `.graphql` document or a content/config file refreshes
  `generated/graphql.ts`.
- The generated content-model types and prototype read API are refreshed by
  the same codegen command.
- The running GraphQL endpoint at `http://localhost:5057/graphql` hot-swaps
  valid content and config generations without restarting the framework.

## Current reload matrix

| Change                                  | Codegen watcher behavior                | Running GraphQL server                           | Framework app                                            | Action required today                                    |
| --------------------------------------- | --------------------------------------- | ------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------- |
| Markdown/YAML field value               | Refreshes types if watched path matches | Hot-swaps after validation                       | Keeps rendering whatever the endpoint returns            | None; framework refresh remains explicit                 |
| New/removed content file                | Refreshes types if watched path matches | Hot-swaps after validation                       | Keeps rendering whatever the endpoint returns            | None; framework refresh remains explicit                 |
| `.graphql` document                     | Regenerates operation types             | No restart unless query text used by app changed | Framework dev server normally recompiles importing files | No Flatbread restart unless app code needs it            |
| `flatbread.config.*` content/ref change | Reloads config and refreshes types      | Rebuilds and hot-swaps after validation          | Keeps rendering whatever the endpoint returns            | None; framework refresh remains explicit                 |
| Transformer/source package code         | Does not rebuild package code           | Keeps previous imported package code             | May keep previous imported package code                  | Rebuild/watch package separately, rerun codegen, restart |
| `generated/graphql.ts`                  | Output of codegen                       | No direct effect                                 | Framework dev server recompiles imports                  | No Flatbread restart                                     |

## Failure semantics today

- If content becomes invalid while `flatbread codegen --watch` is running, the
  watcher logs the validation/codegen error and keeps watching. Existing
  generated files are left as-is until a later successful regeneration.
- In one-shot mode (`flatbread codegen` without `--watch`), validation or
  codegen errors exit non-zero and do not prove the live server changed.
- If the running GraphQL server was started before the invalid edit, it keeps
  serving the schema/data it already loaded. Restarting it surfaces the
  validation error at startup.
- In unified watch mode, invalid candidates are rejected atomically: generated
  artifacts and the live GraphQL server remain on the previous committed graph.

## Draft unified watch design (implemented)

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

- `flatbread start --watch` hot-swaps valid content/config generations; invalid
  candidates leave the prior schema active.
- `flatbread codegen --watch` is a long-running process; do not use it in CI or
  one-shot scripts.
- The Next.js example `pnpm dev` includes `--https` for local convenience, but
  the Flatbread GraphQL endpoint remains documented as HTTP on `5057`. In
  headless environments prefer `pnpm exec flatbread start -- next dev --turbopack`.
- Codegen failures are logged and do not undo a committed schema generation.
- Watch mode requires a source plugin with `fetchPaths`; sources without it fail
  fast at startup.
- `flatbread.config.*` watching is relative to the `flatbread start` cwd.
- Port `5057` collisions are not resolved automatically; stop the old
  Flatbread process before starting another server.

Framework restarts remain explicit: Flatbread keeps the framework child process
running and does not attempt to restart or control its own refresh behavior.
