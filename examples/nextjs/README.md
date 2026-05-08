# Flatbread Next.js Example with TypeScript Codegen

This example is the repo’s **default first success path**: **relational Git-backed markdown** ( **`Post`** ↔ **`Author`** via `refs`; **`tags`** as string arrays on posts) compiled into a typed shape. **GraphQL plus codegen** are one read path baked into this demo, and the generated TypeScript read API gives simple app reads a collection-shaped interface over the same typed model; see [Choosing a read interface](../../README.md#choosing-a-read-interface).

**Note:** `flatbread.config.js` here also declares **PostCategory**, **OverrideTest**, **YamlAuthor**, etc. for integration tests. Treat those as **secondary**; the onboarding narrative is **posts + authors + tags** on the **`Post`** row.

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

   Add or edit **`.graphql`** files under `queries/` (or globs in config), then rerun codegen so **`tags`**, **`authors`**, and other fields stay in sync. Codegen also emits the prototype **generated TypeScript read API** in `generated/graphql.ts`; see `lib/read.ts` for the posts/authors/tags example that calls `createFlatbreadReadApi()`, and see [Choosing a read interface](../../README.md#choosing-a-read-interface) for when to use each read path.

4. **Serve the GraphQL read interface alongside Next** (**there is no `flatbread dev`** — use **`flatbread start`**):

   - **Recommended / headless-safe:** `pnpm exec flatbread start -- next dev --turbopack`.
   - **Package shortcut:** `pnpm dev` — currently passes `--https` for local convenience, but the Flatbread GraphQL endpoint remains documented as HTTP on `5057`.

5. Open **[http://localhost:3000](http://localhost:3000)** for the app. Flatbread defaults to **`http://localhost:5057/graphql`** (not the Next port).

### Scripts in this package

| Script           | Purpose                                                                                   |
|------------------|-------------------------------------------------------------------------------------------|
| `pnpm dev`       | **`flatbread start`** + Next dev (HTTPS). GraphQL on **5057**, Next on **3000**.          |
| `pnpm build`     | **`flatbread start`** wrapping **`next build`** so schema/codegen paths resolve during build. |
| `pnpm start`     | **`next start` only** — production Next; does **not** run Flatbread unless you arrange it. |
| `pnpm run codegen` | **Watch-only:** `flatbread codegen --watch` — regenerate types when config, content, or documents change. |

### Watch-only codegen

For iterative work, run the watcher in a second terminal:

```bash
pnpm run codegen
```

For the full loader/schema/codegen/framework boundary contract, see
[`docs/local-dev-loop.md`](../../docs/local-dev-loop.md). In short: codegen can
watch content/config/document files, but the running GraphQL server still needs
a restart for schema or content changes today.

## Content path

Markdown and YAML for this demo live under **`examples/content`**; this package uses a **`content` → `../content`** symlink so config paths stay `content/markdown/...`.

- **Posts:** `examples/content/markdown/posts/` (`tags` in frontmatter → `[String]` on **`Post`** in the schema.)
- **Authors:** `examples/content/markdown/authors/` (referenced by id from **`Post`** **`authors`**.)

Canonical layout, **backing files for tags** (facet on each post), **traceability** (same **relation model** from files through config to read interfaces and illustrative query JSON), and guidance on GraphQL versus the generated TypeScript read API are documented in the [Flatbread README quickstart](../../README.md#quickstart-posts-authors-and-tags), [Choosing a read interface](../../README.md#choosing-a-read-interface), and [glossary](../../docs/glossary.md).

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

That path queries **posts**, **authors**, and **tags** through the generated TypeScript API while GraphQL remains the underlying execution layer. The lower-level generated methods still accept an optional GraphQL selection string for experimentation, but the canonical example uses the generated default selection so the call site does not hand-write a GraphQL document. For custom selections, persisted operations, or direct GraphQL clients, use operation documents instead; the root [Choosing a read interface](../../README.md#choosing-a-read-interface) section is the canonical contract.

## Troubleshooting

### "No posts found" or network errors

Ensure something is serving Flatbread at **`http://localhost:5057/graphql`** — typically by running **`pnpm dev`** or **`pnpm exec flatbread start -- next dev --turbopack`** from this directory, not `pnpm start` alone.

### TypeScript errors after schema changes

Run **`pnpm exec flatbread codegen --clear-cache --verbose`**.

## Learn more

- [Flatbread package README](../../README.md) — quickstart, install, **`flatbread start`**, and choosing GraphQL or the generated TypeScript read API
- [Glossary](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/glossary.md) — collections, relations; GraphQL as one surface
- [Contributing / monorepo workflow](https://github.com/FlatbreadLabs/flatbread/blob/main/CONTRIBUTING.md)
- [GraphQL Code Generator](https://www.the-guild.dev/graphql/codegen)
- [Next.js Documentation](https://nextjs.org/docs)
