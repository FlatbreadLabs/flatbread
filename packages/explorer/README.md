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

No separate Next app is required.

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
| `matchExplorerPreset(content)` | Detect Effort Graph (and later presets)    |
| `EXPLORER_BOOTSTRAP_PATH`      | Bootstrap JSON path Flatbread injects      |

There is no public React component export in v1.

## Develop in the monorepo

```bash
pnpm --filter @flatbread/explorer test
pnpm --filter @flatbread/explorer build
pnpm play:efforts   # flatbread start --watch --open from repo root
```
