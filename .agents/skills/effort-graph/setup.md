# Effort Graph setup

The canonical skill files live in this package. The repository
`.agents/skills/effort-graph/` directory is an exclusively generated
projection: do not edit it directly, and stale projected files are deleted by
`pnpm skills:sync`.

## 1. Choose the package manager

Use the nearest `package.json`'s `packageManager` field first. If it is absent,
inspect lockfiles. Exactly one of `package-lock.json`, `pnpm-lock.yaml`,
`yarn.lock`, or `bun.lock`/`bun.lockb` must exist. If multiple conflicting
lockfiles exist, ask the user which manager owns the project.

For an end-user release, read `release.json` next to this file. It is the
canonical package and tag authority: use its `flatbreadVersion` and `gitTag`
values exactly. `skills-lock.json` is installation provenance/restore data only;
do not use its optional ref or version fields as release identity:

```bash
npx skills add https://github.com/FlatbreadLabs/flatbread/tree/<gitTag>/packages/effort-graph/skills/effort-graph --skill effort-graph
npm install --save-dev flatbread@<flatbreadVersion>
```

Equivalent commands are:

```bash
pnpm dlx skills add https://github.com/FlatbreadLabs/flatbread/tree/<gitTag>/packages/effort-graph/skills/effort-graph --skill effort-graph
pnpm add -D flatbread@<flatbreadVersion>

yarn dlx skills add https://github.com/FlatbreadLabs/flatbread/tree/<gitTag>/packages/effort-graph/skills/effort-graph --skill effort-graph
yarn add -D flatbread@<flatbreadVersion>

bunx skills add https://github.com/FlatbreadLabs/flatbread/tree/<gitTag>/packages/effort-graph/skills/effort-graph --skill effort-graph
bun add -d flatbread@<flatbreadVersion>
```

Do not use a floating branch, `latest`, or a guessed version. When dogfooding
the Flatbread monorepo, use its workspace `flatbread` binary and do not install
Flatbread from npm.

## 2. Review the configuration

Add the exports through the public `flatbread` facade and preserve existing
content entries:

```js
import {
  defineConfig,
  sourceFilesystem,
  transformerMarkdown,
  effortGraphContent,
} from 'flatbread';

export default defineConfig({
  source: sourceFilesystem(),
  transformer: transformerMarkdown(),
  content: [
    // existing entries
    ...effortGraphContent(), // or effortGraphContent('path/to/graph')
  ],
});
```

Add these entries to `.gitignore` (using the selected graph root):

```gitignore
**/.flatbread-efforts/.journal/
**/.flatbread/effort-graph/read-cache/
```

For a custom root, replace `.flatbread-efforts` with that root. Review both
edits before saving; the bootstrap command never creates or rewrites them.

## 3. Verify activation

```bash
flatbread effort bootstrap
flatbread effort bootstrap --verify
```

The second command must print `{"status":"ready",...}` and exit successfully.
On resume, begin with `flatbread effort list --status active`, then use bounded
effort-scoped reads. Capture mutation `generation` tokens and use
`--strict-min-generation` for immediate read-after-write checks; never implement
client polling loops. Semantic changes go through `flatbread effort write`.

## 4. Open the explorer (optional)

With a complete `effortGraphContent()` preset in config, Flatbread serves the
content-relation explorer automatically (`@flatbread/explorer` ships with
`flatbread`):

```bash
flatbread start --watch --open
```

Mounting and `--open` share the same assets gate: if the packaged SPA assets
are missing, Flatbread skips the explorer mount and `--open` falls back to
`/graphql`.

- Explorer UI (when mounted): `http://localhost:5057/`
- Apollo GraphQL sandbox: `http://localhost:5057/graphql`

No separate app install is required.
