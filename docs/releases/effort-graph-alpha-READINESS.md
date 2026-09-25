# Release readiness report — Effort Graph alpha

**Date:** 2026-07-28
**Candidate gate:** [#233](https://github.com/FlatbreadLabs/flatbread/pull/233) (supersedes closed [#230](https://github.com/FlatbreadLabs/flatbread/pull/230)–[#232](https://github.com/FlatbreadLabs/flatbread/pull/232); CI green; merge blocked on approving review / Mergify queue)
**Checked tree:** PR #233 tip (`9fde89a`), not yet on `main`
**Audience:** release operators

## Overall verdict: **NOT READY**

Build, skills gates, pack dry-runs, `workspace:*` rewrite, and focused tests all **pass** on the #233 tip. Publish of the Effort Graph feature is **blocked** by version collisions: `publish:ci` would skip `flatbread` and `@flatbread/core` (and other drifted packages) at versions already on npm that lack this work. Merge #233 to `main`, bump those packages, first-publish the three new packages, refresh skill pins, then publish.

---

## Package publish matrix

| Package                           | Local version    | npm status                                                 | Action needed                           |
| --------------------------------- | ---------------- | ---------------------------------------------------------- | --------------------------------------- |
| `@flatbread/effort-graph`         | `0.1.0-alpha.0`  | **404** (never published)                                  | **First publish**                       |
| `@flatbread/explorer`             | `0.1.0-alpha.0`  | **404** (never published)                                  | **First publish**                       |
| `@flatbread/proof`                | `0.1.0-alpha.0`  | **404** (never published)                                  | **First publish** (confirm intentional) |
| `flatbread`                       | `1.0.0-alpha.22` | Same version on npm **without** explorer/effort-graph deps | **Bump**, then publish                  |
| `@flatbread/core`                 | `1.0.0-alpha.16` | Same version on npm; missing live watch/schema APIs        | **Bump**, then publish                  |
| `@flatbread/codegen`              | `1.0.0-alpha.2`  | Same version; unpublished commits + peer pins              | **Bump**, then publish                  |
| `@flatbread/config`               | `1.0.0-alpha.9`  | Same version; unpublished commits                          | **Bump**, then publish                  |
| `@flatbread/source-filesystem`    | `1.0.0-alpha.9`  | Same version; unpublished commits                          | **Bump**, then publish                  |
| `@flatbread/transformer-markdown` | `1.0.0-alpha.8`  | Same version; unpublished commits                          | **Bump**, then publish                  |
| `@flatbread/transformer-yaml`     | `1.0.0-alpha.8`  | Same version; unpublished commits                          | **Bump**, then publish                  |
| `@flatbread/utils`                | `1.0.0-alpha.2`  | Same version; toolchain-only delta                         | Bump if included in release set         |
| `@flatbread/resolver-svimg`       | `1.0.0-alpha.0`  | On npm; idle since 2022                                    | **No bump**                             |

`publish:ci` topo order ends with codegen → **flatbread last**. Skips when `npm view name@version` matches; otherwise `pnpm publish --access public`.

---

## Blockers (must fix before publish)

1. **Merge [#233](https://github.com/FlatbreadLabs/flatbread/pull/233) to `main`.** Auto-merge is enabled; GitHub still requires an approving review or `@mergifyio queue` from a write-permission account.
2. **Bump `flatbread` past `1.0.0-alpha.22`.** Registry tarball lacks `@flatbread/explorer` / `@flatbread/effort-graph`. Same version → skip → CLI never ships Effort Graph wiring.
3. **Bump `@flatbread/core` past `1.0.0-alpha.16`.** Local API adds `createLiveSchemaReloader` / `createWatchCoordinator` (and more). Skip leaves a new CLI resolving to old core → broken runtime.
4. **First-publish `@flatbread/effort-graph` and `@flatbread/explorer`** in the same train as bumped `flatbread` (hard deps). `@flatbread/proof` publishes at `0.1.0-alpha.0` unless marked private.
5. **Bump remaining drifted packages** (`codegen`, `config`, `source-filesystem`, transformers; optionally `utils`) so skip semantics do not leave half the feature set on stale registry tarballs. Align codegen **exact peers** with new config/core versions.
6. **Refresh skills `release.json`** (`flatbreadVersion` / `gitTag`) to the new versions and create the matching git tag. Current pins target `1.0.0-alpha.22` / missing `v1.0.0-alpha.22` — skill install path is broken for Effort Graph.

---

## Warnings (should fix or consciously accept)

- **`@flatbread/proof` `files`** ships `src` (incl. tests) and `scripts` — over-broad; tighten unless supervisor needs published source.
- **CLI / routing changes:** new `effort *` commands; `--watch`; `--open` → `/` for Effort Graph; `/events` SSE; `/` claimed by SPA — update proxies, health checks, automation.
- **Schema / codegen growth** from Effort Graph collections; `CODEGEN_OUTPUT_VERSION=2` forces cache invalidation.
- **Stricter TS** on core plugin contracts; dropped `graphql-compose-json` / `lru-cache` — re-codegen and diff schema.
- **`effort-graph` `.d.ts` imports `@flatbread/core` types** but core is only a devDependency — declare peer or document “install with flatbread/core”.
- **Node ≥ 20.19**; `@parcel/watcher` for watch; prefer Node 20 LTS over 22 for production watch until EINVAL teardown is proven clean.
- **Explorer tarball** must include prebuilt `dist/static` (full `pnpm build` before publish — `build:types` alone is insufficient).
- **Dist-tag `alpha` lags `latest`** — retag or document “use latest / exact”; do not advertise `@alpha`.
- **Confirm product intent** to publish `@flatbread/proof` in this train.

---

## Notes

| Gate                                                     | Status                                  |
| -------------------------------------------------------- | --------------------------------------- |
| `pnpm install --frozen-lockfile`                         | PASS                                    |
| `pnpm build`                                             | PASS (explorer SPA in `dist/static`)    |
| `pnpm skills:check` / `skills:pack-check`                | PASS                                    |
| Pack dry-run (all 12 public packages on #233 tip)        | PASS                                    |
| `workspace:*` → concrete versions on pack                | PASS                                    |
| Focused tests (effort-graph, explorer, flatbread, proof) | PASS                                    |
| Version readiness for feature publish                    | **FAIL**                                |
| #233 merged to `main`                                    | **PENDING** (blocked on review / queue) |

**Suggested publish order:** utils (if bumping) → config → transformers / source-filesystem → **core** → codegen → **first-publish effort-graph + proof** → **first-publish explorer** → **bumped flatbread last** → retag skills / docs → leave resolver-svimg alone.
