# `@flatbread/explorer`

Content-relation explorer for Flatbread. v1 ships a generic SPA shell plus an
**Effort Graph** preset. When your config uses `effortGraphContent()`,
`flatbread start` serves this UI at `/`.

## Local DX

```bash
# flatbread.config.js includes effortGraphContent()
flatbread start --watch --open
# → http://localhost:5057/          explorer
# → http://localhost:5057/graphql   Apollo sandbox
```

No separate Next app is required. Requires a built `dist/static` (see
[Develop in the monorepo](#develop-in-the-monorepo)); `pnpm play:efforts` runs
that build automatically.

## Static deploy

This package publishes prebuilt assets under `dist/static/`. Drop them on any
static host and point at a reachable Flatbread GraphQL endpoint:

```
https://your-host.example/?endpoint=https://api.example.com/graphql
```

Same-origin deploys (assets served by Flatbread) need no query param.

## Package surface (v1)

| Export                         | Role                                       |
| ------------------------------ | ------------------------------------------ |
| `getExplorerStaticDir()`       | Absolute path to `dist/static` for Express |
| `explorerAssetsPresent()`      | Whether prebuilt `index.html` exists       |
| `matchExplorerPreset(content)` | Detect Effort Graph (and later presets)    |
| `EXPLORER_BOOTSTRAP_PATH`      | Bootstrap JSON path Flatbread injects      |

There is no public React component export in v1.

## Develop in the monorepo

```bash
pnpm --filter @flatbread/explorer test
pnpm play:efforts   # builds explorer, then flatbread start --watch --open
```

For UI-only iteration with HMR, run Flatbread and Vite in separate terminals
(Vite proxies `/graphql` and `/events` to Flatbread on port **5057**, or
`FLATBREAD_PORT` when set):

```bash
pnpm exec flatbread start --watch          # terminal 1 — GraphQL on :5057
pnpm --filter @flatbread/explorer dev      # terminal 2 — SPA on :5173
```
