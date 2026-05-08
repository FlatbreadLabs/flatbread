# Tooling modernization notes

This note records the modernization decisions from the proof DAG run used to
scope this stack. The changes are intentionally conservative: make current
checks reachable and deterministic first, then defer broad lint/test runner
replacement until the repository has fewer overlapping toolchain generations.

## Stack entries

### 1. Package test toolchain and root scripts

Objective:

- Modernize the packages that already use Vitest:
  `@flatbread/codegen` and `@flatbread/utils`.
- Add root scripts that expose typechecking, split test runners, and a full
  local verification path.
- Pin the package manager and Node floor used by the modern Vite/Vitest stack.

Rationale:

- The Vitest suites existed but were not reachable from `pnpm test`.
- The updated Vitest packages need aligned local `vite`, `typescript`,
  `@types/node`, and `tsup` versions to avoid peer drift.
- Package-local `tsconfig.json` files keep TS 6 options scoped to the updated
  packages instead of forcing every package off the older shared TS 4.7 path at
  once.

Migration notes:

- `pnpm test` now builds the workspace, runs AVA, then runs the Vitest suites.
- Root `typecheck` is a pilot scoped to `@flatbread/proof`, the only package
  with a dedicated typecheck script today.
- `prepublish:ci` now uses a frozen install plus declaration generation instead
  of recursively updating dependency ranges.

Rollback:

- Revert `package.json`, `tsconfig.json`,
  `packages/codegen/package.json`, `packages/codegen/tsconfig.json`,
  `packages/utils/package.json`, `packages/utils/tsconfig.json`, and
  `pnpm-lock.yaml`.

### 2. CI verification hardening

Objective:

- Make installs deterministic.
- Enforce lint, typecheck, build, and tests in CI.
- Fix integration coverage so the SvelteKit job exercises the SvelteKit example.

Rationale:

- The prior workflow used mutable `pnpm i` installs.
- `lint` only ran Prettier, `typecheck` was absent, and package Vitest suites
  were not part of the root test script.
- `integration-sveltekit` previously ran `pnpm play:build`, which builds the
  Next.js example.

Migration notes:

- The workflow pins pnpm to `10.33.0` and uses `pnpm install --frozen-lockfile`.
- `pnpm-workspace.yaml` explicitly approves native build scripts that are
  required by the current toolchain and examples, including `esbuild`, `sharp`,
  and `sqlite3`.
- `FLATBREAD_CI` is set once at workflow scope.
- `permissions: contents: read` and cancellation concurrency reduce the default
  token scope and cancel superseded PR runs.
- SvelteKit integration now runs root build and `examples/sveltekit` build.
  `svelte-check` remains deferred because the existing route data types report
  a pre-existing `data.allPostCategories` error after `svelte-kit sync`.

Rollback:

- Revert `.github/workflows/pipeline.yml`. The local scripts from the previous
  entry remain independently useful.

### 3. Config hygiene from adversarial audit

Objective:

- Remove pnpm configuration that package manifests cannot enforce.
- Make workspace path aliases and example package metadata explicit.

Rationale:

- `pnpm.peerDependencyRules` only applies from the workspace root, so package
  local copies in `@flatbread/codegen` and `flatbread` created warning noise
  without changing install behavior.
- The Next.js example invoked the `flatbread` CLI without declaring the
  workspace dependency it relies on.
- Root path aliases should cover workspace packages consistently for editor and
  package-local TS config consumers.

Rollback:

- Revert the config hygiene commit to restore the previous package metadata,
  path aliases, and lockfile entries.

### 4. Decision record and deferred follow-ups

Objective:

- Document major modernization choices, especially the decision not to adopt
  Biome or Oxc in this pass.
- Leave reviewers with clear follow-up seams.

Rollback:

- Revert this document only.

## Biome and Oxc evaluation

Biome and Oxc were evaluated as possible replacements or partial replacements
for ESLint and Prettier. They are not adopted in this stack.

Why not adopt Biome now:

- Prettier currently checks the whole repository, including Markdown and YAML.
  A partial Biome migration would require careful single-writer boundaries to
  avoid formatting the same files with two tools.
- The examples already use framework-specific ESLint stacks:
  Next.js uses `eslint-config-next`, and SvelteKit uses `eslint-plugin-svelte`.
  Biome would not replace those framework rules cleanly.
- A packages-only Biome pilot may still be worthwhile, but it should be a
  dedicated PR with explicit excludes in `.prettierignore`.

Why not adopt Oxc now:

- Oxlint is best as a fast lint accelerator, not a complete replacement for
  framework ESLint rules and TypeScript-aware project policy.
- Root ESLint is not currently enforced by `pnpm lint`, and its dependency graph
  is already skewed. Adding Oxlint before deciding whether to repair or demote
  root ESLint would increase the number of lint surfaces.

Recommended future pilot:

1. Repair root linting first: either migrate root packages to ESLint 9 flat
   config with explicit `typescript-eslint` dependencies, or remove the dormant
   root ESLint script and rely on compiler plus formatter checks.
2. If the repo still wants a Rust-based formatter/linter, pilot Biome only for
   `packages/**/src/**/*.{ts,tsx,js,mjs,cjs}` and keep Prettier responsible for
   Markdown, YAML, snapshots, and framework examples.
3. Consider Oxlint only after the ESLint boundary is explicit, as an additional
   fast lint signal rather than the primary rule authority.

## Runtime impact

Measured locally in this cloud workspace:

- Proof audit DAG: 5/5 tasks completed in about 1 minute 9 seconds.
- Adversarial follow-up DAG: 5/5 tasks completed in about 55 seconds.
- Updated `@flatbread/codegen` + `@flatbread/utils` builds completed in about
  4 seconds after the package-local TS configs were added.
- `pnpm typecheck` for the current proof pilot completed in about 2.5 seconds.

CI impact must be measured from GitHub Actions after merge or on the draft PR:

- Frozen installs should reduce nondeterministic lockfile drift, not necessarily
  raw runtime.
- Cancellation concurrency should reduce wasted runner minutes on superseded PR
  pushes.
- The old SvelteKit integration job duplicated Next.js coverage. The new job
  spends those runner cells on actual SvelteKit build coverage instead of
  duplicate Next.js validation.

## Deferred recommendations

- Migrate or remove dormant root ESLint in a dedicated linting PR.
- Unify AVA and Vitest after deciding whether package-local tests should all
  move to Vitest, or keep both with the contributor guide's current split.
- Add package-level `typecheck` scripts and move toward project references or a
  monorepo `tsc -b` flow.
- Add coverage collection and thresholds around critical paths after test runner
  boundaries are settled.
- Audit deprecated runtime dependencies such as Apollo Server v3 and
  Express-GraphQL separately from this tooling stack.
- Confirm whether `@nrwl/workspace` is still used; remove it in its own PR if
  it is dead weight.
- Resolve the existing SvelteKit route data typing issue, then add
  `svelte-check` to CI.
