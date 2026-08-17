# @flatbread/core 🍶

The internal GraphQL schema generator for Flatbread. This runs the plugins declared in the user's config, pulling in content and transforming it prior to generating the GraphQL schema.

Most applications should use the full [Flatbread package](https://www.npmjs.com/package/flatbread).

Install `@flatbread/core` directly when you are building a custom GraphQL
server or another low-level integration:

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

In application code, import the re-exported helpers from `flatbread`:

```ts
import { exportCollectionsAsJson, exportCollectionsAsCsv } from 'flatbread';
```

For a low-level integration, import from the package installed above:

```ts
import {
  exportCollectionsAsJson,
  exportCollectionsAsCsv,
} from '@flatbread/core';
```

See [the snapshot export guide](https://github.com/FlatbreadLabs/flatbread/blob/main/apps/docs/content/docs/json-export.md)
for the full export contract and examples.
