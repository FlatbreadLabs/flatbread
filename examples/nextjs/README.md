# Flatbread Next.js Example with TypeScript Codegen

This example shows **Flatbread** as **relational, Git-tracked content for a TypeScript app**: markdown and YAML under version control are loaded into a typed model; **GraphQL is one read interface** (alongside anything else you build). Next.js uses generated operation types against the Flatbread GraphQL endpoint.

## Quick start (from monorepo root)

Flatbread development assumes this **pnpm** workspace. Use one path end-to-end:

1. **Install and build packages** (excluding examples):

   ```bash
   pnpm install
   pnpm build
   ```

2. **Work in this example:**

   ```bash
   cd examples/nextjs
   ```

3. **Generate TypeScript types once** (paths and globs come from `flatbread.config.js`; default output is `generated/graphql.ts`):

   ```bash
   pnpm exec flatbread codegen --verbose
   ```

4. **Run Next.js and the Flatbread GraphQL server together** via the CLI (**there is no `flatbread dev` subcommand** — use **`flatbread start`**):

   - **Default (local HTTPS for Next):** `pnpm dev` — runs `flatbread start --https -- next dev --turbopack`.
   - **Headless / no HTTPS** (e.g. agents, CI): `pnpm exec flatbread start -- next dev --turbopack`.

5. Open **[http://localhost:3000](http://localhost:3000)** for the app. The Flatbread GraphQL HTTP endpoint defaults to **`http://localhost:5057/graphql`** (not the Next port).

### Scripts in this package

| Script | Purpose |
|--------|--------|
| `pnpm dev` | **`flatbread start`** + Next dev (HTTPS). GraphQL on **5057**, Next on **3000**. |
| `pnpm build` | **`flatbread start`** wrapping **`next build`** so schema/codegen paths resolve during build. |
| `pnpm start` | **`next start` only** — production Next; does **not** run Flatbread. Use only if you already have GraphQL served elsewhere. |
| `pnpm run codegen` | **Watch-only:** `flatbread codegen --watch` — regenerate types when config, content, or documents change. |

### Watch-only codegen

For iterative work, you can run the watcher in a second terminal (leave it running until you stop it):

```bash
pnpm run codegen
```

## Project structure

Aligned with the App Router layout in this repo:

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
