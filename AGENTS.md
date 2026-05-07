# Agents

## Cursor Cloud specific instructions

### Overview

Flatbread is a Git-native relational content layer for TypeScript/JavaScript applications. It's a pnpm monorepo that sources flat files (Markdown, YAML), transforms them into relational data, and auto-generates a GraphQL API. See `CONTRIBUTING.md` for full development workflow.

### Key commands

- **Install**: `pnpm install` (enforces pnpm via `preinstall` script)
- **Build**: `pnpm build` (builds all packages except examples via tsup)
- **Lint**: `pnpm lint` (runs prettier)
- **Tests**: `pnpm test` (ava tests) and `pnpm -F @flatbread/utils exec vitest run` / `pnpm -F @flatbread/codegen exec vitest run` (vitest tests — use `run` flag to avoid watch mode)
- **Dev server**: `cd examples/nextjs && npx flatbread start -- next dev --turbopack` (GraphQL on port 5057, Next.js on port 3000)

### Gotchas

- **pnpm v10 blocks native build scripts by default.** After `pnpm install`, you must manually run postinstall scripts for native packages. The critical ones are:
  - `node node_modules/.pnpm/esbuild@0.15.1/node_modules/esbuild/install.js` (and other esbuild versions: 0.13.15, 0.14.54, 0.18.20, 0.21.5)
  - `cd node_modules/.pnpm/sharp@0.30.7/node_modules/sharp && npm run install` (and versions 0.31.3, 0.34.3)
  - `node node_modules/.pnpm/@swc+core@1.13.3/node_modules/@swc/core/postinstall.js`
  - `cd node_modules/.pnpm/@tailwindcss+oxide@4.1.11/node_modules/@tailwindcss/oxide && node scripts/install.js`
  - Version numbers may change over time; check the pnpm install warning output for the exact list of blocked packages.
- **Vitest packages run in watch mode by default.** Always use `vitest run` (not bare `vitest`) to get a single run and exit.
- **`flatbread` CLI is not on PATH.** Use `npx flatbread` when running from a shell. The `pnpm play` script from the root handles this automatically.
- **Build before test.** All packages must be built (`pnpm build`) before running tests or starting dev servers.
- **The Next.js example `dev` script uses `--https`.** This requires an SSL certificate. In headless/CI environments, run without `--https`: `npx flatbread start -- next dev --turbopack`.
