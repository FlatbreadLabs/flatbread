# @flatbread/core 🍶

The internal GraphQL schema generator for Flatbread. This runs the plugins declared in the user's config, pulling in content and transforming it prior to generating the GraphQL schema.

As a general user of Flatbread, you likely want to use the full [Flatbread module](https://www.npmjs.com/package/flatbread)

However, you can utilize this package directly to build your own custom GraphQL server via installing:

```bash
pnpm i @flatbread/core@latest
```

## Snapshot exports

This package also exposes stable snapshot export helpers for the validated
content graph:

- `exportCollectionsAsJson(configResult, options)` returns deterministic JSON
  snapshots for selected collections.
- `exportCollectionsAsCsv(configResult, options)` returns flat CSV views over
  that same validated data.

Prefer importing these helpers from `flatbread` in app code, since the main
package re-exports `@flatbread/core` and is the primary consumer-facing surface.
Import from `@flatbread/core` directly when you intentionally want the lower
level package:

```ts
import { exportCollectionsAsJson, exportCollectionsAsCsv } from 'flatbread';
```

See [the snapshot export guide](https://github.com/FlatbreadLabs/flatbread/blob/main/apps/docs/content/docs/json-export.md)
for the full export contract and examples.
