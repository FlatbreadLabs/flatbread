# Flatbread alpha — Effort Graph release

> **Status (2026-07-28):** Draft against PR [#233](https://github.com/FlatbreadLabs/flatbread/pull/233) (supersedes [#232](https://github.com/FlatbreadLabs/flatbread/pull/232)). Not yet merged to `main`. See also [readiness report](./effort-graph-alpha-READINESS.md).

Flatbread is a filesystem-backed GraphQL content layer. This alpha ships **Effort Graph**: Git-tracked agent memory (efforts, issues, findings, decisions, and related records) with a journaled writer, a live explorer UI on `flatbread start`, typed codegen, JSON/CSV export, and a Proof DAG runner for Cursor agents. Nothing in this feature set is on npm yet at matching package versions — existing alphas must be bumped and three new packages first-published together.

---

## Highlights

1. **Effort Graph** — journaled semantic mutations over markdown under Git; preset `effortGraphContent()`; agent skills for journaling, modeling, and review.
2. **Explorer SPA** — content-relation visualizer (Effort Graph preset) served at `/` by `flatbread start` when the preset is active; `--open` lands on the SPA.
3. **Live watch + SSE** — `flatbread start --watch` hot-swaps schema/content; clients get generation frames on `/events`.
4. **`flatbread effort *` CLI** — write, get, list, records, relations, blocking-decisions, bootstrap, cache prune.
5. **Codegen & typed reads** — content-model TypeScript types + generated read API; stricter ID/ref validation.
6. **Export** — `exportCollectionsAsJson` and CSV export from `@flatbread/core`.
7. **`@flatbread/proof`** — DAG task runner (`proof` / `proof-supervisor`) for Cursor subagents.

---

## What's new

- **`@flatbread/effort-graph`** (new): journaled writer, Citation/Blob records, digests/reads, `effortGraphContent()`, packaged skills (`effort-graph`, `effort-modeling`, `grill-with-efforts`).
- **`@flatbread/explorer`** (new): prebuilt SPA under `dist/static`; Node helpers; mounted by the CLI when Effort Graph is configured.
- **`flatbread effort write|get|list|records|relations|blocking-decisions|bootstrap|cache prune`** — Effort Graph CLI surface.
- **`flatbread start --watch`** — unified watch coordinator + live schema swap; **`/events`** SSE.
- **`flatbread start --open`** — with Effort Graph + explorer assets, opens `/` (SPA), not Apollo `/graphql`.
- **`@flatbread/core`**: `createLiveSchemaReloader`, `createWatchCoordinator`, record production / path classification, ID/ref validation, JSON/CSV export helpers.
- **`@flatbread/codegen`**: `CODEGEN_OUTPUT_VERSION=2`; content-model types + TypeScript read API generation.
- **`@flatbread/config`**: `loadConfig` returns initialized `LoadedFlatbreadConfig`.
- **`@flatbread/proof`** (new): DAG runner with loops, artifacts, Cursor model handling; bins `proof`, `proof-supervisor`.
- Source/transformer alignment for `**` path captures and record production (`@flatbread/source-filesystem`, transformers).

---

## Packages in this release

| Package                           | Version intent                                       | New vs bump              |
| --------------------------------- | ---------------------------------------------------- | ------------------------ |
| `@flatbread/effort-graph`         | `0.1.0-alpha.0` (first publish)                      | **new**                  |
| `@flatbread/explorer`             | `0.1.0-alpha.0` (first publish)                      | **new**                  |
| `@flatbread/proof`                | `0.1.0-alpha.0` (first publish)                      | **new**                  |
| `flatbread`                       | bump past `1.0.0-alpha.22`                           | **bump** (required)      |
| `@flatbread/core`                 | bump past `1.0.0-alpha.16`                           | **bump** (required)      |
| `@flatbread/codegen`              | bump past `1.0.0-alpha.2`                            | **bump**                 |
| `@flatbread/config`               | bump past `1.0.0-alpha.9`                            | **bump**                 |
| `@flatbread/source-filesystem`    | bump past `1.0.0-alpha.9`                            | **bump**                 |
| `@flatbread/transformer-markdown` | bump past `1.0.0-alpha.8`                            | **bump**                 |
| `@flatbread/transformer-yaml`     | bump past `1.0.0-alpha.8`                            | **bump**                 |
| `@flatbread/utils`                | bump past `1.0.0-alpha.2` (optional; toolchain only) | **bump** if republishing |
| `@flatbread/resolver-svimg`       | `1.0.0-alpha.0` unchanged                            | idle — no bump           |

---

## Breaking / migration notes

- **Install as a set.** A new `flatbread` hard-depends on `@flatbread/effort-graph` and `@flatbread/explorer`. Publish those before or with the CLI. Bump `@flatbread/core` in the same train — published `alpha.16` lacks live-schema/watch APIs the CLI needs.
- **`flatbread start --open`** with `effortGraphContent()` opens `/` (explorer), not `/graphql`. GraphQL remains at `/graphql`; new SSE at `/events`. Do not health-check `/` as GraphQL.
- **`--watch` is opt-in.** Without it, start stays closer to a single schema load.
- **Server-only `start`** (no corunner) is intentional; omit dummy secondary processes.
- **Codegen:** re-run after upgrade; Effort Graph injects many collections (name collisions possible). Cache hash includes `CODEGEN_OUTPUT_VERSION=2` — expect a one-time full regen. Align codegen peers with bumped config/core.
- **Custom sources/transformers:** tighter TypeScript (`ContentEntry`, optional `fetchPaths`); path matching for `**`/captures changed.
- **Core deps dropped:** `graphql-compose-json`, `lru-cache` — re-codegen and diff schema shapes.
- **Node:** use **≥ 20.19** for this stack (stale plugin `engines` / README “Node 16+” are outdated). Watch adds `@parcel/watcher`.
- **Skills:** refresh `release.json` pins to the new `flatbread` version and a real `gitTag` before advertising skill install (current pins point at pre–Effort Graph `alpha.22` / missing tag).
- **Dist-tag `alpha` lags `latest`** on several packages — install `@latest` or exact versions, not `@alpha`.
- **`examples/effort-viz` removed** — use packaged explorer via `flatbread start --watch --open` (or `pnpm play:efforts` in-repo).

---

## Getting started

```bash
# After publish (use the bumped versions, not the stale alphas below as pins)
npm i flatbread@latest

# Config: spread Effort Graph content into your Flatbread config
#   ...effortGraphContent()

flatbread effort bootstrap --verify
flatbread start --watch --open

# Mutations / reads
flatbread effort write '<json>'
flatbread effort list
flatbread codegen
```

Optional agent runner (separate package):

```bash
npm i @flatbread/proof
proof   # or proof-supervisor
```
