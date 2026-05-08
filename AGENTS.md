# Agents

## Cursor Cloud specific instructions

### Overview

Flatbread is Git-native **relational content for TypeScript/JavaScript apps**: flat files become a typed graph; **GraphQL is one read surface**, not the whole product. It's a pnpm monorepo. See `CONTRIBUTING.md` for the canonical onboarding path.

### Key commands

See `CONTRIBUTING.md` for full details. Quick reference:

- **Install**: `pnpm install` (enforces pnpm via `preinstall` script)
- **Build**: `pnpm build` (builds all packages except examples via tsup)
- **Lint**: `pnpm lint` (prettier)
- **Lint fix (after edits)**: `pnpm lint:fix:fast` (writes formatting repo-wide to match `pnpm lint`; staged-only: `pnpm lint:fix`, also runs via `.husky/pre-commit`)
- **Typecheck**: `pnpm typecheck`
- **Test**: `pnpm test` (builds, then runs ava + vitest suites, including `@flatbread/proof` bounded-loop coverage). For the focused proof loop suite: `pnpm -F @flatbread/proof test`. Vitest packages use `pnpm -F @flatbread/utils exec vitest run` / `pnpm -F @flatbread/codegen exec vitest run` (`run` avoids watch mode).
- **Full verify**: `pnpm verify` (lint + typecheck + build + test)
- **Proof loop contract**: explicit `DAG.loops[].reexecute.tasks` subsets must be dependency-closed, multiple loops must have disjoint re-execution sets, and `DAG.loops` must not be combined with `--converge-on`.
- **Dev server**: `pnpm play` (GraphQL on port 5057, Next.js on port 3000). From `examples/nextjs`, prefer `pnpm exec flatbread start -- next dev --turbopack`. Use `flatbread start` — `flatbread dev` is not a CLI command.

### Mergify Stacks

The repo uses Mergify stacks for PR management. The `mergify-cli` is installed via `pip install mergify-cli` (included in the update script). Key points:

- Use `mergify stack push` instead of `git push` on feature branches (the `.husky/pre-push` hook will remind you).
- The commit-msg hook (`.husky/commit-msg`) auto-appends a `Change-Id` trailer for stack tracking.
- See `.agents/skills/mergify-stack/SKILL.md` for the full workflow.

### Gotchas

- **`@flatbread/proof` requires `CURSOR_RIPGREP_PATH`.** The proof package uses `@cursor/sdk` which expects a bundled ripgrep. In Cloud Agent VMs, set `export CURSOR_RIPGREP_PATH=/usr/bin/rg` to use the system ripgrep (included in the update script).
- **Native build scripts are approved in `pnpm-workspace.yaml`.** The `onlyBuiltDependencies` list allows esbuild, sharp, @swc/core, etc. to run their postinstall scripts automatically during `pnpm install`.
- **Vitest packages run in watch mode by default.** Always use `vitest run` (not bare `vitest`) to get a single run and exit.
- **`flatbread` CLI is not on PATH globally.** From `examples/nextjs`, prefer `pnpm exec flatbread …` (local binary), or `npx flatbread` from a shell. The `pnpm play` script from the root handles this automatically.
- **Build before test.** All packages must be built (`pnpm build`) before running tests or starting dev servers. `pnpm test` handles this automatically.
- **The Next.js example `dev` script uses `--https`.** This requires an SSL certificate. In headless/CI environments, run without `--https`: `pnpm exec flatbread start -- next dev --turbopack`.
- **Full local CI parity check:** `pnpm verify` runs lint, typecheck, build, and all tests.

### Weave merge driver

The repo uses [weave](https://ataraxy-labs.github.io/weave/docs.html) for entity-level semantic merges. The `.gitattributes` file routes supported file types (`.ts`, `.js`, `.json`, `.md`, `.yaml`, etc.) through `weave-driver`, which resolves merges at the function/class/entity level instead of line-by-line.

- **Binaries**: `weave` (CLI) and `weave-driver` (git merge driver), installed via `cargo install --git https://github.com/Ataraxy-Labs/weave weave-cli weave-driver`. The update script handles this.
- **Preview a merge**: `weave preview <branch>` — dry-run that shows which files/entities would merge cleanly or conflict.
- **Config**: `weave setup` was already run; git config `merge.weave.driver` points to `weave-driver`. No re-run needed unless the binary path changes.
- **Rust toolchain**: Weave requires Rust >= 1.89. The update script ensures `rustup default stable` is set.
