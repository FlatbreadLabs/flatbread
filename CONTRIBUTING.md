# Contributing to Flatbread

Thanks for your interest in contributing! This guide covers local development and the release process (bumping versions and publishing packages).

**Flatbread** is **relational, Git-tracked content for TypeScript apps**: flat files in the repo become a typed content graph. **GraphQL is one consumer** of that graph (see `docs/glossary.md`), not the whole product story.

For the **canonical posts / authors / tags** onboarding narrative (collections, `refs`, codegen, then GraphQL), see the [Flatbread package README quickstart](https://github.com/FlatbreadLabs/flatbread/blob/main/packages/flatbread/README.md#quickstart-posts-authors-and-tags) (traceability: **files → config → query interface**, tied to **`docs/glossary.md`**).

## Prerequisites

- Node 20.19+
- pnpm 10.33.x via Corepack (`corepack enable && corepack prepare pnpm@10.33.0 --activate`)
- Clean git working tree (commit/stash your work first)

## Recommended onboarding (try Flatbread in the Next.js example)

Use this single path first; it matches how CI and most contributors exercise the stack (**shared content** under `examples/content`, symlinked from the Next app as `content/`):

1. From the **monorepo root**: `pnpm install` then `pnpm build` (builds all packages except `examples/*`).
2. `cd examples/nextjs`
3. One-shot codegen: `pnpm exec flatbread codegen --verbose` (output: `generated/graphql.ts`; globs and dirs come from `flatbread.config.js`).
4. Run the app **and** Flatbread together with **`flatbread start`** (there is **no** `flatbread dev` subcommand):
   - **`pnpm dev`** — Next dev with local HTTPS + Flatbread (GraphQL on **5057**, Next on **3000**).
   - Headless / no HTTPS: `pnpm exec flatbread start -- next dev --turbopack`.

Optional **`pnpm play`** from the repo root is a shortcut for **`cd examples/nextjs && pnpm dev`** — same as step 4 above, not a separate product command.

## Local development

- Install dependencies: `pnpm install` (or `pnpm -w i`)
- Build all packages: `pnpm build`
- **Workspace libraries (watch-only):** `pnpm dev` — runs package `dev` scripts (e.g. `tsup --watch`) for `packages/*`; it does **not** start the Next.js example.
- **Next.js example:** prefer the flow under [Recommended onboarding](#recommended-onboarding-try-flatbread-in-the-nextjs-example); or `pnpm play` as a convenience alias.
- Check local CI parity before opening a PR: `pnpm verify`

## Working on a package

Open another terminal tab while keeping the dev server running.

- Option 1 (preferred): use the Next.js example as a demo project

  - Work in the full context of a Flatbread instance as an end-user would, while tinkering with `packages/*` internals.
  - Commands: follow [Recommended onboarding](#recommended-onboarding-try-flatbread-in-the-nextjs-example), or from root run **`pnpm play`** (`cd examples/nextjs && pnpm dev`).
  - Good when you want to test without creating per-package temporary clutter.

- Option 2: scope to a specific package
  - Change directory: `cd packages/<package>`
  - Run the package entry (ensure built first): `node dist/index.mjs`
  - Tip: you may need to seed with `pnpm build` once if types/builds are missing.

### Build for production

Uses `tsup` to build each package in the monorepo (excluding integration examples):

```bash
pnpm build
```

## Pull Requests and Tests

- Keep PRs small and focused; link related issues.
- Ensure CI passes all checks.
- Run `pnpm verify` locally when your change touches source, tests, package metadata, or CI.
- Add test coverage for both positive and negative cases:
  - Positive: expected success paths and typical inputs.
  - Negative: invalid inputs, edge cases, and error handling/failure modes.
- Place tests in the relevant package and use its existing runner/config.
  - Root `pnpm test` builds the workspace, runs the AVA suite configured by `ava.config.js`, then runs the package-local Vitest suites.
  - Bounded-loop coverage for `@flatbread/proof` is exercised by both `pnpm test` and `pnpm -F @flatbread/proof test`.
  - That focused proof suite is the quickest check for loop parser/runtime guards such as explicit rerun validation, overlapping-loop rejection, and convergence iteration accounting.
  - Vitest is currently used by `@flatbread/codegen` and `@flatbread/utils`.
  - `@flatbread/proof` exposes a package-local AVA entrypoint for the loop schema suite; most other packages are covered by the root AVA suite or do not yet expose a package-local `test` script.
- `pnpm lint` is the enforced Prettier formatting gate. After editing, run `pnpm lint:fix:fast` so formatting matches CI (Cursor agents: see `.cursor/rules/post-edit-lint-fix.mdc`). On commit, `.husky/pre-commit` runs `pnpm lint:fix` (Pretty Quick on staged files). `pnpm lint:eslint` is an optional/manual root ESLint check until the linting stack is modernized.
- Helpful commands:
  - Local CI parity: `pnpm verify`
  - Root test suite: `pnpm test`
  - Proof bounded-loop suite: `pnpm -F @flatbread/proof test`
  - Package-local test scripts where present: `pnpm -r --if-present test`
  - Single package: `pnpm -F <package-name> test`
  - Watch (where supported): `pnpm -F <package-name> test:watch`

## Releasing packages

There are two steps:

1. Bump versions where there are changes
2. Publish the changed packages

### 1) Bump versions only where there are changes

Use the interactive bump script:

```bash
pnpm bump
```

What the script does:

- Detects changes since last publish per package by:
  - Querying npm for the package's latest published version and its publish time
  - Comparing git commits in `packages/<name>` since that time
  - Ignoring commits that only change the `version` field in `package.json`
  - Skipping packages that are not yet published on npm
- Preselects only changed packages for you to bump
- Runs `pnpm bumpp --no-commit --no-push --no-tag` in each selected package directory

Notes:

- Commit the version bumps after the script completes. For example:

  ```bash
  git add packages/**/package.json
  git commit -m "release: bump versions for changed packages"
  ```

- Debugging: set `FLATBREAD_BUMP_DEBUG=1` to see detection details

  ```bash
  FLATBREAD_BUMP_DEBUG=1 pnpm bump
  ```

- New (unpublished) packages: these are excluded from the bump prompt. Ensure their `package.json` has the desired starting version before publishing (see below).

### 2) Publish packages

> Note: you must have access permissions on NPM

Publish all public packages (the script builds first and then attempts to publish each package):

```bash
pnpm publish:ci
```

Details:

- Builds the repo: `pnpm run build`
- Iterates public packages in `packages/*` and runs:

  ```bash
  pnpm publish --access public --no-git-checks
  ```

- If a package's version was not changed, the publish for that package will error and the script will move on to the next
- Unpublished packages will be published for the first time
- Dist-tags (alpha/beta) are currently disabled in the script. If you need them, bump with a pre-release version (`x.y.z-alpha.n`) and add tagging logic in `scripts/publish.ts`

### Post-publish

- Push your commits:

  ```bash
  git push
  ```

- Tag a new release via Github and include a set of changes with Dev Experience in mind

## Troubleshooting

- The bump script shows all packages as changed

  - If npm is unreachable, the script may conservatively mark packages as changed

- A package didn’t appear in the bump list

  - If the local version is already higher than npm’s latest, it’s considered already bumped
  - Unpublished packages are skipped during bump but will be published during `publish:ci`

- First-time publish of a new package
  - Set an appropriate initial version in `packages/<name>/package.json`
  - Run `pnpm publish:ci` (the script will publish it)

If something’s unclear or you hit an issue, please open an issue or ask in Slack.
