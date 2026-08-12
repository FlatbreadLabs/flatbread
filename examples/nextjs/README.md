# Flatbread Next.js Example with TypeScript Codegen

This example turns Markdown files in Git into typed data for a Next.js app.
Posts link to authors through `refs`, and each post can have a list of string
tags. GraphQL and codegen are one way to read that data. The generated
TypeScript API is another; see
[Choosing a read interface](../../packages/flatbread/README.md#choosing-a-read-interface).

**Note:** `flatbread.config.js` also includes collections used by integration
tests. For this guide, focus on posts, authors, and tags.

## Quick start (from monorepo root)

1. **Install and build packages** (excluding examples):

   ```bash
   pnpm install
   pnpm build
   ```

2. **Enter this example:**

   ```bash
   cd examples/nextjs
   ```

3. **Generate TypeScript types once** (paths and globs come from `flatbread.config.js`; output: `generated/graphql.ts`):

   ```bash
   pnpm exec flatbread codegen --verbose
   ```

   Add or edit **`.graphql`** files under `queries/` (or globs in config), then rerun codegen so **`tags`**, **`authors`**, and other fields stay in sync. Codegen also emits the prototype **generated TypeScript read API** in `generated/graphql.ts`; see `lib/read.ts` for the posts/authors/tags example that calls `createFlatbreadReadApi()`, and see [Choosing a read interface](../../packages/flatbread/README.md#choosing-a-read-interface) for when to use each read path.

4. **Start Flatbread and Next** (**there is no `flatbread dev`** — use
   **`flatbread start`**):

   - `pnpm dev` — runs watch mode and starts Next
     (`pnpm exec flatbread start --watch -- next dev --turbopack`).
     GraphQL on **5057**, Next on **3000**.

   With `--watch`, Flatbread reloads valid content and config changes and
   refreshes generated types. You do not need a second codegen watcher.

5. Open **[http://localhost:3000](http://localhost:3000)** for the app. Flatbread defaults to **`http://localhost:5057/graphql`** (not the Next port).

### Scripts in this package

| Script                                    | Purpose                                                                                             |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `pnpm dev`                                | **`flatbread start --watch`** + Next dev. GraphQL on **5057**, Next on **3000**.                    |
| `pnpm build`                              | **`flatbread start`** wrapping **`next build`** so schema/codegen paths resolve during build.       |
| `pnpm start`                              | **`next start` only** — production Next; does **not** run Flatbread unless you arrange it.          |
| `pnpm run codegen`                        | Optional separate type watcher. Use it only when `flatbread start --watch` is not running.           |
| `pnpm run demo:watch-query`               | Watch `example-post.md` and print updated posts/authors/tags query results.                         |
| `pnpm run demo:edit` / `demo:restore`     | Edit and restore the watched post title for the demo loop.                                          |

### Separate codegen watcher

`pnpm dev` already watches content, config, and GraphQL documents. Do not run
this command beside it.

Use this command only when Flatbread is started without `--watch` and you want
generated types to update:

```bash
pnpm run codegen
```

For details about what changes reload automatically, see
[the local dev loop guide](../../apps/docs/content/docs/local-dev-loop.md). When Flatbread starts
without `--watch`, restart it after content or config changes.

To see a Markdown/YAML edit/query loop without manually restarting a server, run
the focused demo watcher:

```bash
pnpm run demo:watch-query
```

Then run `pnpm run demo:edit`; the terminal prints updated Markdown
posts/authors/tags and YAML author query results. Full walkthrough:
[the edit-and-watch demo](../../apps/docs/content/docs/edit-file-see-query-update-demo.md).

## Content path

Markdown and YAML for this demo live under **`examples/content`**; this package uses a **`content` → `../content`** symlink so config paths stay `content/markdown/...`.

- **Posts:** `examples/content/markdown/posts/` (`tags` in frontmatter → `[String]` on **`Post`** in the schema.)
- **Authors:** `examples/content/markdown/authors/` (referenced by id from **`Post`** **`authors`**.)

The [Flatbread README quickstart](../../packages/flatbread/README.md#quickstart-posts-authors-and-tags)
explains the file layout, tags, and how files become app data. See
[Choosing a read interface](../../packages/flatbread/README.md#choosing-a-read-interface)
and the [glossary](../../apps/docs/content/docs/glossary.md) for more detail.

## Project structure

- `app/` — routes and components (`page.tsx`, `post/[id]/`, etc.)
- `lib/graphql.ts` — GraphQL client helpers (default endpoint `http://localhost:5057/graphql`)
- `generated/graphql.ts` — generated TypeScript types and documents (`flatbread codegen`)
- `queries/*.graphql` — GraphQL documents included via `flatbread.config.js`
- `flatbread.config.js` — sources, transformers, collections, and codegen options
- `content` → `../content` — shared example content (symlink to `examples/content`)

## Configuration snippets

Codegen in `flatbread.config.js` matches the checked-in file — excerpt:

```javascript
codegen: {
  enabled: true,
  outputDir: './generated',
  outputFile: 'graphql.ts',
  documents: [
    './**/*.graphql',
    './**/*.gql',
    './components/**/*.graphql',
  ],
  // ...
},
```

## Regenerating types

After changing Flatbread config, content, or `.graphql` documents:

```bash
pnpm exec flatbread codegen --verbose
```

Force regeneration (clear cache):

```bash
pnpm exec flatbread codegen --clear-cache --verbose
```

## Generated TypeScript read API prototype

The demo still keeps GraphQL available, but `flatbread codegen` now also emits typed helpers from the configured content model:

- `createFlatbreadReadApi(execute)` — builds collection readers with generated default selections.
- `FlatbreadRecord<'Post'>` — typed record for a configured collection.
- `FlatbreadRelationTarget<'Post', 'authors'>` — typed relation result (`ReadonlyArray<Author>` for this example).

`lib/read.ts` wires those helpers to this app's existing `graphqlFetch` client:

```typescript
import { getPostsAuthorsAndTagsViaReadApi } from './lib/read';

const posts = await getPostsAuthorsAndTagsViaReadApi();
const authorNames = posts[0]?.authors?.map((author) => author.name);
const tags = posts[0]?.tags;
```

That path queries **posts**, **authors**, and **tags** through the generated
TypeScript API while GraphQL handles the request underneath. Lower-level
generated methods can also take a GraphQL selection string. This example uses
the default selection, so the call site does not need a GraphQL document. For
custom selections, persisted operations, or direct GraphQL clients, use
operation documents instead; see
[Choosing a read interface](../../packages/flatbread/README.md#choosing-a-read-interface).

## Troubleshooting

### "No posts found" or network errors

Ensure Flatbread is serving **`http://localhost:5057/graphql`**. From this
directory, run **`pnpm dev`** or
**`pnpm exec flatbread start --watch -- next dev --turbopack`**. `pnpm start`
runs Next alone.

### TypeScript errors after schema changes

Run **`pnpm exec flatbread codegen --clear-cache --verbose`**.

## Learn more

- [Flatbread package README](../../packages/flatbread/README.md) — quickstart, install, **`flatbread start`**, and choosing GraphQL or the generated TypeScript read API
- [Glossary](https://github.com/FlatbreadLabs/flatbread/blob/main/apps/docs/content/docs/glossary.md) — collections, relations, and GraphQL as one way to read data
- [Contributing guide](https://github.com/FlatbreadLabs/flatbread/blob/main/CONTRIBUTING.md)
- [GraphQL Code Generator](https://www.the-guild.dev/graphql/codegen)
- [Next.js Documentation](https://nextjs.org/docs)
