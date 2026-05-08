# Agents

## Cursor Cloud specific instructions

### Overview

Flatbread is a Git-native relational content layer for TypeScript/JavaScript applications. It's a pnpm monorepo that sources flat files (Markdown, YAML), transforms them into relational data, and auto-generates a GraphQL API. See `CONTRIBUTING.md` for full development workflow.

### Key commands

See `CONTRIBUTING.md` for full details. Quick reference:

- **Install**: `pnpm install`
- **Build**: `pnpm build`
- **Lint**: `pnpm lint` (prettier)
- **Typecheck**: `pnpm typecheck`
- **Test**: `pnpm test` (builds, then runs ava + vitest suites)
- **Full verify**: `pnpm verify` (lint + typecheck + build + test)
- **Dev server**: `pnpm play` (GraphQL on port 5057, Next.js on port 3000)

### Mergify Stacks

The repo uses Mergify stacks for PR management. The `mergify-cli` is installed via `pip install mergify-cli` (included in the update script). Key points:

- Use `mergify stack push` instead of `git push` on feature branches (the `.husky/pre-push` hook will remind you).
- The commit-msg hook (`.husky/commit-msg`) auto-appends a `Change-Id` trailer for stack tracking.
- See `.agents/skills/mergify-stack/SKILL.md` for the full workflow.

### Gotchas

- **Native build scripts are approved in `pnpm-workspace.yaml`.** The `onlyBuiltDependencies` list allows esbuild, sharp, @swc/core, etc. to run their postinstall scripts automatically during `pnpm install`.
- **Vitest packages run in watch mode by default.** Always use `vitest run` (not bare `vitest`) to get a single run and exit.
- **`flatbread` CLI is not on PATH.** Use `npx flatbread` when running from a shell. The `pnpm play` script from the root handles this automatically.
- **Build before test.** All packages must be built (`pnpm build`) before running tests or starting dev servers. `pnpm test` handles this automatically.
- **The Next.js example `dev` script uses `--https`.** This requires an SSL certificate. In headless/CI environments, run without `--https`: `npx flatbread start -- next dev --turbopack`.
- **Full local CI parity check:** `pnpm verify` runs lint, typecheck, build, and all tests.
