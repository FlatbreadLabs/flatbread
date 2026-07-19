# Snapshot export

Snapshot exports are part of Flatbread's data ownership story: they turn the
same repo-backed content graph into portable review artifacts. See
[data ownership and exit story](./data-ownership.md) for how raw files, Git
history, JSON/CSV exports, GraphQL introspection, and generated types fit
together.

`@flatbread/core` exposes `exportCollectionsAsJson(configResult, options)` for
stable collection snapshots and `exportCollectionsAsCsv(configResult, options)`
for flat collection views. They are currently API surfaces rather than CLI
commands.

## What stays the same

- Selected collection names are sorted by Unicode codepoint order.
- Records are sorted by normalized record ID.
- Object keys are sorted recursively by Unicode codepoint order.
- Record IDs and configured relation fields use Flatbread's normalized ID
  semantics.
- `_path` is emitted relative to `options.pathRoot` (default:
  `process.cwd()`); `_filename`, `_slug`, and transformer-provided fields are
  preserved.
- ID and reference validation runs before export output is returned, so broken
  refs and duplicate IDs fail the same way they fail schema generation.

## Example

```ts
import { exportCollectionsAsJson } from '@flatbread/core';
import { loadConfig } from '@flatbread/config';

const configResult = await loadConfig({ cwd: process.cwd() });
const snapshot = await exportCollectionsAsJson(configResult, {
  collections: ['Post', 'Author'],
  pathRoot: process.cwd(),
});

console.log(JSON.stringify(snapshot, null, 2));
```

## Current scope

- JSON export is read-only; it does not mutate source files.
- Relation values are exported as normalized IDs, not expanded nested records.
- Source metadata is included today so snapshots are actionable during review.
  A future option may strip `_path` / `_filename` for content-only diffs.

## CSV flat views

CSV export is intentionally a flat view over the same validated JSON snapshot:

- scalar fields become columns;
- scalar arrays and relation-id arrays are joined with `;` by default;
- relation fields remain normalized reference IDs rather than expanded records;
- nested objects such as `_content` are omitted because they do not yet have a
  stable flat representation.
- the delimiter defaults to `,`; `;` and tab are also supported;
- joined array/relation values default to `;`, configurable with
  `relationSeparator`.

```ts
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
