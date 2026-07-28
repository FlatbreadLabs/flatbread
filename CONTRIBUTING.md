# Contributing to Flatbread

Thanks for your interest in contributing! This guide covers local development and the release process (bumping versions and publishing packages).

**Flatbread** turns related content files in Git into typed data for TypeScript
apps. **GraphQL is one way to read that data** (see `docs/glossary.md`); it is
not the whole product.

For a first project with posts, authors, and tags, see the
[Flatbread package README quickstart](https://github.com/FlatbreadLabs/flatbread/blob/main/packages/flatbread/README.md#quickstart-posts-authors-and-tags).

## Prerequisites

- Node 20.19+
- pnpm 10.33.x via Corepack (`corepack enable && corepack prepare pnpm@10.33.0 --activate`)
- Clean git working tree (commit/stash your work first)

## Recommended onboarding (try Flatbread in the Next.js example)

Use this path first. The Next.js app reads shared content from
`examples/content` through its `content/` symlink:

1. From the **monorepo root**: `pnpm install` then `pnpm build` (builds all packages except `examples/*`).
2. `cd examples/nextjs`
3. One-shot codegen: `pnpm exec flatbread codegen --verbose` (output: `generated/graphql.ts`; globs and dirs come from `flatbread.config.js`).
4. Run the app **and** Flatbread together with **`flatbread start`** (there is **no** `flatbread dev` subcommand):
   - **`pnpm dev`** — starts Next and watches Flatbread content, config, and GraphQL documents (`pnpm exec flatbread start --watch -- next dev --turbopack`). GraphQL runs on **5057** and Next on **3000**.

Optional **`pnpm play`** from the repo root is a shortcut for **`cd examples/nextjs && pnpm dev`** — same as step 4 above, not a separate product command.

## Local development

- Install dependencies: `pnpm install` (or `pnpm -w i`)
- Build all packages: `pnpm build`
- **Workspace libraries (watch-only):** `pnpm dev` — runs package `dev` scripts (e.g. `tsup --watch`) for `packages/*`; it does **not** start the Next.js example.
- **Next.js example:** prefer the flow under [Recommended onboarding](#recommended-onboarding-try-flatbread-in-the-nextjs-example); or `pnpm play` as a convenience alias.
- **Effort Graph explorer:**
  1. Run `pnpm play:efforts` (builds `@flatbread/explorer` via `preplay:efforts`, then `flatbread start --watch --open`).
  2. When `flatbread.config.js` uses `effortGraphContent()`, Flatbread serves `@flatbread/explorer` at `http://localhost:5057/`. The Apollo sandbox is at `/graphql`.
  3. For hot module replacement (HMR) on the single-page app (SPA) shell, run `pnpm exec flatbread start --watch` and `pnpm --filter @flatbread/explorer dev` in parallel. Vite on **5173** proxies API routes to **5057**.
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
- Preselects changed packages and their workspace dependents for you to bump
- Required workspace dependents must remain selected when a changed dependency is selected
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

When changing the Effort Graph skill, edit the source files under
`packages/effort-graph/skills/effort-graph/`, then run these checks in order:

```bash
pnpm skills:sync
pnpm skills:check
pnpm skills:pack-check
```

Bump and publish `@flatbread/effort-graph` and `flatbread` together when the
skill and runtime need matching versions. The publish script checks the copied
skill files and package contents first. It then publishes ordinary packages,
`@flatbread/effort-graph`, and finally `flatbread`, stopping at the first
failure.

Publish all public packages (the script builds first and then attempts to publish each package):

```bash
pnpm publish:ci
```

Details:

- Builds the repo: `pnpm run build`
- Iterates public packages in dependency-safe deterministic order and runs:

  ```bash
  pnpm publish --access public --no-git-checks
  ```

- Before each publish, checks `npm view <name>@<version> version --json`. An
  exact version already in the registry is reported as already published and
  skipped; npm not-found responses proceed to publish, while authentication,
  network, and other errors abort before that package is published.
- If a release stops after some packages publish, rerun `pnpm publish:ci`
  safely. Exact versions already published are skipped, and the script resumes
  with the first package that still needs publishing.
- Unpublished packages will be published for the first time
- Dist-tags (alpha/beta) are currently disabled in the script. If you need them, bump with a pre-release version (`x.y.z-alpha.n`) and add tagging logic in `scripts/publish.ts`

### Post-publish

- Only after every package publishes successfully, create an annotated,
  immutable `v<flatbread-version>` Git tag at the exact release commit SHA
  printed by `pnpm publish:ci`, then push the release commit and tag:

  ```bash
  git tag -a v<flatbread-version> <release-commit-sha> -m "Release v<flatbread-version>"
  git push
  git push origin v<flatbread-version>
  ```

  Protect release tags in the repository settings so they cannot be moved or
  deleted after publication.

End users install the skill from that release tag and install the matching
`flatbread` version:

```bash
npx skills add https://github.com/FlatbreadLabs/flatbread/tree/vX/packages/effort-graph/skills/effort-graph --skill effort-graph
npm install --save-dev flatbread@X
```

`skills update` does not advance an immutable tag. To upgrade deliberately,
install a newer release tag and its matching `flatbread` version.

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
