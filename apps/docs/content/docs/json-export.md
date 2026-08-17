---
id: json-export
title: Snapshot export
section: data
order: 2
summary: JSON and CSV snapshots of a collection, with a stable sort order you can diff.
related:
  - data-ownership
---

# Snapshot export

**Next action (1 minute): choose the output that matches the job.**

- Choose [JSON](#create-a-json-snapshot) for nested, reviewable collection
  snapshots.
- Choose [CSV](#csv-flat-views) for scalar fields and relation IDs in a
  spreadsheet.

These are API calls, not CLI commands. See the
[data ownership and exit story](./data-ownership.md) for the other exit paths.

## Create a JSON snapshot

Allow about 10 minutes if your Flatbread config already loads.

1. Create `scripts/export-content.mjs` in your project.
2. Paste this code and change the collection names:

   ```js
   import { exportCollectionsAsJson } from '@flatbread/core';
   import { loadConfig } from '@flatbread/config';

   const configResult = await loadConfig({ cwd: process.cwd() });
   const snapshot = await exportCollectionsAsJson(configResult, {
     collections: ['Post', 'Author'],
     pathRoot: process.cwd(),
   });

   console.log(JSON.stringify(snapshot, null, 2));
   ```

3. Write the snapshot to a file:

   ```bash
   node scripts/export-content.mjs > flatbread-snapshot.json
   ```

Success: `flatbread-snapshot.json` contains one JSON object whose keys are the
selected collection names.

## Stable ordering

- Selected collection names are sorted by Unicode codepoint order.
- Records are sorted by normalized record ID.
- Object keys are sorted recursively by Unicode codepoint order.

## Stable IDs and source details

- Record IDs and configured relation fields use Flatbread's normalized ID
  semantics.
- `_path` is emitted relative to `options.pathRoot` (default:
  `process.cwd()`); `_filename`, `_slug`, and transformer-provided fields are
  preserved.
- ID and reference validation runs before export output is returned, so broken
  refs and duplicate IDs fail the same way they fail schema generation.

## Current scope

- JSON export is read-only; it does not mutate source files.
- Relation values are exported as normalized IDs, not expanded nested records.
- Source metadata is included today so snapshots are actionable during review.

## CSV flat views

CSV export is intentionally a flat view over the same validated JSON snapshot:

- Scalar fields become columns.
- Scalar arrays and relation-ID arrays are joined with `;` by default.
- Relation fields stay as normalized IDs instead of expanded records.
- Nested objects such as `_content` are omitted because they do not yet have a
  stable flat representation.

Delimiter controls:

- The delimiter defaults to `,`; `;` and tab are also supported.
- Joined array and relation values default to `;`, configurable with
  `relationSeparator`.

```js
import { exportCollectionsAsCsv } from '@flatbread/core';

const csv = await exportCollectionsAsCsv(configResult, {
  collections: ['Post'],
  delimiter: ',',
  relationSeparator: ';',
});

console.log(csv.Post);
```

Example output:

```csv
id,_filename,_path,_slug,author,authors,tags,title
known-post,known-post.md,content/posts/known-post.md,known-post,known-author,known-author,known-tag,Post With Resolved Refs
```

Next: create `scripts/export-content.mjs`; that takes under 2 minutes.
