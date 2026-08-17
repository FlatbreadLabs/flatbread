# Contributing to Flatbread

Thanks for your interest in contributing! This guide covers local development and the release process (bumping versions and publishing packages).

**Flatbread** turns related content files in Git into typed data for TypeScript
apps. **GraphQL is one way to read that data** (see
`apps/docs/content/docs/glossary.md`); it is not the whole product.

For a first project with posts, authors, and tags, see the
[Flatbread package README quickstart](https://github.com/FlatbreadLabs/flatbread/blob/main/packages/flatbread/README.md#quickstart-posts-authors-and-tags).

## Prerequisites

- Node 20.19+ on the Node 20 line, or Node 22.12+
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
- **Documentation site:** from the repo root, `pnpm docs:dev` builds the packages (`predocs:dev` runs `pnpm build` first, so a fresh clone works), then starts Flatbread on **5057** and Next on **3000**. `pnpm docs:build` builds the packages and then the static site. `pnpm docs:check` builds the packages first, then checks frontmatter, links, graph parity, and generated queries. The content model is in `apps/docs/README.md`.
- `pnpm play` and `pnpm docs:dev` both use ports **5057** and **3000**. Stop
  one before starting the other.
- **Proof explorer:**
  1. Run `pnpm play:efforts` (builds `@flatbread/explorer` via `preplay:efforts`, then `flatbread start --watch --open`).
  2. When `flatbread.config.js` uses `proofContent()`, Flatbread serves `@flatbread/explorer` at `http://localhost:5057/`. The Apollo sandbox is at `/graphql`.
  3. For hot module replacement (HMR) on the single-page app (SPA) shell, run `pnpm exec flatbread start --watch` and `pnpm --filter @flatbread/explorer dev` in parallel. Vite on **5173** proxies API routes to **5057**.
- Check local CI parity before opening a PR: `pnpm verify`. It builds and tests
  the packages, builds the static docs site at both `/` and `/flatbread`,
  validates every exported route, asset, fragment, and id, and runs the
  critical production audit gate.

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
  - Vitest is currently used by `@flatbread/codegen` and `@flatbread/utils`.
  - Most other packages are covered by the root AVA suite or do not yet expose a package-local `test` script.
- `pnpm lint` is the enforced Prettier formatting gate. After editing, run `pnpm lint:fix:fast` so formatting matches CI (Cursor agents: see `.cursor/rules/post-edit-lint-fix.mdc`). On commit, `.husky/pre-commit` runs `pnpm lint:fix` (Pretty Quick on staged files). `pnpm lint:eslint` is an optional/manual root ESLint check until the linting stack is modernized.
- Helpful commands:
  - Local CI parity: `pnpm verify`
  - Root test suite: `pnpm test`
  - Package-local test scripts where present: `pnpm -r --if-present test`
  - Single package: `pnpm -F <package-name> test`
- Watch (where supported): `pnpm -F <package-name> test:watch`

The workspace pins patched `sharp@0.35.3` for `svimg` and Next.js. Older
versions can try an unsupported Windows source build when a binary download
fails. Remove the `svimg` override after it moves to `sharp` 0.35 or newer.

Oven (the DAG task runner for Cursor agents) now lives at
https://github.com/FlatbreadLabs/oven.

## Releasing packages

There are two steps:

1. Bump every public package to one version
2. Publish the release

### Lockstep versions

Every public package shares one version. A release bumps the whole set even
when only one package changed. This keeps package combinations, the Proof skill
manifest, and the Git tag tied to one release.

`packages/proof/skills/proof/release.json` records the version an
end user installs. Edit that file, not the copy in `.agents/`. Then run
`pnpm skills:sync` to refresh the `.agents/` copy and `pnpm skills:pack-check`,
which fails unless `flatbreadVersion` and `proofVersion` match the current
`package.json` versions and `gitTag` equals `v<flatbreadVersion>`. `pnpm verify`
runs both checks.

### 1) Bump every public package

Use the interactive bump script:

```bash
pnpm bump
```

What the script does:

- Detects whether any public package changed since the last publish by:
  - Querying npm for the package's latest published version and its publish time
  - Comparing git commits in `packages/<name>` since that time
  - Ignoring commits that only change the `version` field in `package.json`
  - Skipping packages that are not yet published on npm
- Passes every public package manifest to one `bumpp` command so one chosen
  version is written across the set
- Stops before publishing if any public package version differs

Notes:

- Commit the version bumps after the script completes. For example:

  ```bash
  git add packages/**/package.json
  git commit -m "release: bump public packages"
  ```

- Debugging: set `FLATBREAD_BUMP_DEBUG=1` to see detection details

  ```bash
  FLATBREAD_BUMP_DEBUG=1 pnpm bump
  ```

- New public packages join the same version as the rest of the release set.

### 2) Publish packages

> Note: you must have access permissions on NPM

When changing the Proof skill, edit the source files under
`packages/proof/skills/proof/`, then run these checks in order:

```bash
pnpm skills:sync
pnpm skills:check
pnpm skills:pack-check
```

Bump and publish `@flatbread/proof` and `flatbread` together when the
skill and runtime need matching versions. The publish script checks the copied
skill files and package contents first. It then publishes ordinary packages,
`@flatbread/proof`, and finally `flatbread`, stopping at the first
failure.

Publish all public packages (the script checks for one shared version, builds,
then attempts to publish each package):

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
`flatbread` version. Replace `X` with the released version — `1.0.0` for the
first stable release, so the tag is `v1.0.0`:

```bash
npx skills add https://github.com/FlatbreadLabs/flatbread/tree/vX/packages/proof/skills/proof --skill proof
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
