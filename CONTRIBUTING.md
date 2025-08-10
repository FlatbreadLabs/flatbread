# Contributing to Flatbread

Thanks for your interest in contributing! This guide covers local development and the release process (bumping versions and publishing packages).

## Prerequisites

- Node 16+
- pnpm
- Clean git working tree (commit/stash your work first)

## Local development

- Install dependencies: `pnpm -w i`
- Build all packages: `pnpm build`
- Run dev across packages: `pnpm dev`
- Work in examples (Next.js preferred): `pnpm play`

## Working on a package

Open another terminal tab while keeping the dev server running.

- Option 1 (preferred): use the Next.js example as a demo project

  - Work in the full context of a Flatbread instance as an end-user would, while tinkering with `packages/*` internals.
  - Command: `pnpm play` (starts the Next.js example)
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
- Add test coverage for both positive and negative cases:
  - Positive: expected success paths and typical inputs.
  - Negative: invalid inputs, edge cases, and error handling/failure modes.
- Place tests in the relevant package and use its existing runner/config (Vitest in most packages; some legacy tests use Ava).
- Helpful commands:
  - All packages: `pnpm -r test`
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
