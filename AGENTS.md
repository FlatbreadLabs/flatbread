# Agents

## Cursor Cloud specific instructions

### Overview

Flatbread is Git-native **relational content for TypeScript/JavaScript apps**: flat files become a typed graph; **GraphQL is one read surface**, not the whole product. It's a pnpm monorepo. See `CONTRIBUTING.md` for the canonical onboarding path.

### Key commands

- **Install**: `pnpm install` (enforces pnpm via `preinstall` script)
- **Build**: `pnpm build` (builds all packages except examples via tsup)
- **Lint**: `pnpm lint` (runs prettier)
- **Tests**: `pnpm test` (root AVA suite, including `@flatbread/proof` bounded-loop coverage) and `pnpm -F @flatbread/proof test` for the focused proof loop suite. Vitest packages use `pnpm -F @flatbread/utils exec vitest run` / `pnpm -F @flatbread/codegen exec vitest run` (`run` avoids watch mode).
- **Proof loop contract**: explicit `DAG.loops[].reexecute.tasks` subsets must be dependency-closed, multiple loops must have disjoint re-execution sets, and `DAG.loops` must not be combined with `--converge-on`.
- **Dev server**: `cd examples/nextjs && pnpm exec flatbread start -- next dev --turbopack` (GraphQL on **5057**, Next on **3000**). Use **`pnpm dev`** in that folder for local HTTPS. Use **`flatbread start`** — **`flatbread dev` is not a CLI command.**

### Gotchas

- **pnpm v10 blocks native build scripts by default.** After `pnpm install`, you must manually run postinstall scripts for native packages. The critical ones are:
  - `node node_modules/.pnpm/esbuild@0.15.1/node_modules/esbuild/install.js` (and other esbuild versions: 0.13.15, 0.14.54, 0.18.20, 0.21.5)
  - `cd node_modules/.pnpm/sharp@0.30.7/node_modules/sharp && npm run install` (and versions 0.31.3, 0.34.3)
  - `node node_modules/.pnpm/@swc+core@1.13.3/node_modules/@swc/core/postinstall.js`
  - `cd node_modules/.pnpm/@tailwindcss+oxide@4.1.11/node_modules/@tailwindcss/oxide && node scripts/install.js`
  - Version numbers may change over time; check the pnpm install warning output for the exact list of blocked packages.
- **Vitest packages run in watch mode by default.** Always use `vitest run` (not bare `vitest`) to get a single run and exit.
- **`flatbread` CLI is not on PATH globally.** From `examples/nextjs`, prefer **`pnpm exec flatbread …`** (local binary). From the repo root, **`pnpm play`** runs **`cd examples/nextjs && pnpm dev`**, which invokes **`flatbread start`** via package scripts.
- **Build before test.** All packages must be built (`pnpm build`) before running tests or starting dev servers.
- **The Next.js example `dev` script uses `--https`.** This requires an SSL certificate. In headless/CI environments, run without `--https`: `pnpm exec flatbread start -- next dev --turbopack`.
