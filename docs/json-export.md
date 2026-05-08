# JSON snapshot export

`@flatbread/core` exposes `exportCollectionsAsJson(configResult, options)` for
stable collection snapshots. It is currently an API surface rather than a CLI
command.

## Stability contract

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
- CSV export is tracked separately and should define its own relation-flattening
  policy.
