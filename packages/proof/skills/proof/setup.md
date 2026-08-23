# Proof setup

The canonical skill files live in this package. The repository
`.agents/skills/proof/` directory is an exclusively generated
projection: do not edit it directly, and stale projected files are deleted by
`pnpm skills:sync`.

## 1. Install the matching CLI and skill

From the project root, with npm, pnpm, Yarn, or Bun:

```bash
npx --yes flatbread@latest proof install-skill
```

That command downloads the latest `flatbread` CLI, adds that exact version as
a devDependency, and copies the Proof skill that shipped with it into your
agent skill directories. You do not substitute a version or git tag.

`@latest` only chooses which CLI to run. The installer then pins that CLI's
exact version in the project — it does not write a floating `latest` range.
To pin a specific release, replace `@latest` with that version.

The installer detects your package manager from `package.json`'s
`packageManager` field, then from lockfiles. If several lockfiles conflict
and `packageManager` is unset, it stops rather than guessing.

`release.json` next to this file is lockstep identity for the packaged
skill. `skills-lock.json` is installation provenance only; do not treat its
optional ref or version fields as release identity.

When dogfooding this monorepo, use the workspace `flatbread` binary and
`pnpm skills:sync`. Do not install Flatbread from npm.

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
