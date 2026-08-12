# Proof setup

The canonical skill files live in this package. The repository
`.agents/skills/proof/` directory is an exclusively generated
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
npx skills add https://github.com/FlatbreadLabs/flatbread/tree/<gitTag>/packages/proof/skills/proof --skill proof
npm install --save-dev flatbread@<flatbreadVersion>
```

Equivalent commands are:

```bash
pnpm dlx skills add https://github.com/FlatbreadLabs/flatbread/tree/<gitTag>/packages/proof/skills/proof --skill proof
pnpm add -D flatbread@<flatbreadVersion>

yarn dlx skills add https://github.com/FlatbreadLabs/flatbread/tree/<gitTag>/packages/proof/skills/proof --skill proof
yarn add -D flatbread@<flatbreadVersion>

bunx skills add https://github.com/FlatbreadLabs/flatbread/tree/<gitTag>/packages/proof/skills/proof --skill proof
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
  proofContent,
} from 'flatbread';

export default defineConfig({
  source: sourceFilesystem(),
  transformer: transformerMarkdown(),
  content: [
    // existing entries
    ...proofContent(), // or proofContent('path/to/graph')
  ],
});
```

Add these entries to `.gitignore` (using the selected graph root):

```gitignore
**/.flatbread-proof/.journal/
**/.flatbread/proof/read-cache/
```

For a custom root, replace `.flatbread-proof` with that root. Review both
edits before saving; the bootstrap command never creates or rewrites them.

## 3. Verify activation

```bash
flatbread proof bootstrap
flatbread proof bootstrap --verify
```

The second command must print `{"status":"ready",...}` and exit successfully.
On resume, begin with `flatbread proof list --status active`, then use bounded
effort-scoped reads. Capture mutation `generation` tokens and use
`--strict-min-generation` for immediate read-after-write checks; never implement
client polling loops. Semantic changes go through `flatbread proof write`.

## 4. Open the explorer (optional)

With a complete `proofContent()` preset in config, Flatbread serves the
content-relation explorer automatically (`@flatbread/explorer` ships with
`flatbread`):

```bash
npx flatbread start --watch --open
```

Flatbread checks for the prebuilt single-page app (SPA) assets under
`dist/static/`. When those assets are missing, Flatbread does not serve the
explorer and `npx flatbread start --open` opens `/graphql` instead.

- Explorer UI (when served): `http://localhost:5057/`
- Apollo GraphQL sandbox: `http://localhost:5057/graphql`

No separate app install is required.
