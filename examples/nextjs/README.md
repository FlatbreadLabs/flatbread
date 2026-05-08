# Flatbread Next.js Example with TypeScript Codegen

This example is the repo’s **default first success path**: **relational Git-backed markdown** ( **`Post`** ↔ **`Author`** via `refs`; **`tags`** as string arrays on posts) compiled into a typed shape. **GraphQL plus codegen** are the **read interface baked into this demo**—not Flatbread’s only story; see [`docs/positioning.md`](../../docs/positioning.md).

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

   Add or edit **`.graphql`** files under `queries/` (or globs in config), then rerun codegen so **`tags`**, **`authors`**, and other fields stay in sync.

4. **Serve the GraphQL read interface alongside Next** (**there is no `flatbread dev`** — use **`flatbread start`**):

   - **Default (local HTTPS for Next):** `pnpm dev` — runs `flatbread start --https -- next dev --turbopack`.
   - **Headless / no HTTPS** (e.g. agents, CI): `pnpm exec flatbread start -- next dev --turbopack`.

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

## Content path

Markdown and YAML for this demo live under **`examples/content`**; this package uses a **`content` → `../content`** symlink so config paths stay `content/markdown/...`.

- **Posts:** `examples/content/markdown/posts/` (`tags` in frontmatter → `[String]` on **`Post`** in the schema.)
- **Authors:** `examples/content/markdown/authors/` (referenced by id from **`Post`** **`authors`**.)

Canonical layout is described alongside commands in the [root README quickstart](https://github.com/FlatbreadLabs/flatbread/blob/main/README.md#quickstart-posts-authors-and-tags).

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

## Troubleshooting

### "No posts found" or network errors

Ensure something is serving Flatbread at **`http://localhost:5057/graphql`** — typically by running **`pnpm dev`** or **`pnpm exec flatbread start -- next dev --turbopack`** from this directory, not `pnpm start` alone.

### TypeScript errors after schema changes

Run **`pnpm exec flatbread codegen --clear-cache --verbose`**.

## Learn more

- [Flatbread package README](https://github.com/FlatbreadLabs/flatbread/tree/main/packages/flatbread#readme) — install and **`flatbread start`**
- [Glossary](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/glossary.md) — collections, relations; GraphQL as one surface
- [Contributing / monorepo workflow](https://github.com/FlatbreadLabs/flatbread/blob/main/CONTRIBUTING.md)
- [GraphQL Code Generator](https://www.the-guild.dev/graphql/codegen)
- [Next.js Documentation](https://nextjs.org/docs)
