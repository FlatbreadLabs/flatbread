---
id: data-ownership
title: Data ownership and exit story
section: concepts
order: 30
summary: Your flat files stay the source of truth; exports and types keep them portable.
related:
  - json-export
  - positioning
---

# Data ownership and exit story

Flatbread's portability story starts with a simple constraint: **your flat files
remain the source of truth**. Markdown, YAML, and any other source files live in
your repository, move through normal Git workflows, and can be reviewed without
a hosted dashboard.

## What you own

- **Raw content files** — posts, authors, tags, and other records are ordinary
  repo files.
- **Git history** — every content change can be branched, reviewed, reverted,
  and diffed with the same tools as code.
- **Flatbread config** — collection paths, refs, sources, transformers, and
  codegen options are explicit project files.
- **Generated artifacts** — GraphQL schema/types, generated read helpers, JSON
  snapshots, and CSV flat views can be regenerated from the repo. Generated
  read helpers are Flatbread runtime helpers; operation types and snapshots are
  the more portable exit artifacts.

## Exit paths

| Surface               | What it gives you                                                                | Exit use                                                                         |
| --------------------- | -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Raw files             | Original Markdown/YAML content and frontmatter                                   | Move to another static/content pipeline without export first                     |
| Git history           | Reviewable content lineage                                                       | Audit, revert, or migrate by commit range                                        |
| JSON snapshots        | Stable collection records with normalized IDs/refs                               | Feed another app, script, archive, or migration                                  |
| CSV flat views        | Spreadsheet-friendly scalar fields and reference IDs; nested objects are omitted | Review simple collections, hand off to non-developers, seed tabular tools        |
| GraphQL introspection | The generated read schema                                                        | Discover API shape or generate external clients while Flatbread serves the graph |
| Generated TypeScript  | Operation types and model helper types                                           | Preserve typed query/result contracts while changing framework integration       |

## JSON and CSV exports

`@flatbread/core` currently exposes export APIs:

```ts
import {
  exportCollectionsAsCsv,
  exportCollectionsAsJson,
} from '@flatbread/core';
import { loadConfig } from '@flatbread/config';

const configResult = await loadConfig({ cwd: process.cwd() });

const json = await exportCollectionsAsJson(configResult, {
  collections: ['Post', 'Author'],
});

const csv = await exportCollectionsAsCsv(configResult, {
  collections: ['Post'],
});
```

Both exports validate the content graph before returning output. Broken refs or
duplicate IDs fail before snapshots are produced, which keeps the export story
aligned with Flatbread's relational integrity work.

See [snapshot export docs](./json-export.md) for sort order, path behavior,
relation handling, and CSV flattening details.

## GraphQL schema and generated types

GraphQL is one read interface over the same repo-backed model. While a
Flatbread server is running, standard GraphQL tooling can introspect
`http://localhost:5057/graphql` to discover the generated schema. The checked-in
GraphQL documents and generated TypeScript operation types are useful migration
artifacts because they show the read shapes your app depended on.

If you leave Flatbread, the prototype generated read API should be treated as a
convenience wrapper to replace or reimplement; the raw files, JSON/CSV
snapshots, GraphQL operation documents, and operation result types are the more
durable exit surfaces.

## What Flatbread does not lock in

- You do not need a hosted CMS account to read your source data.
- You do not need a proprietary database dump to recover content.
- You do not need GraphQL to preserve the content itself; GraphQL is one read
  interface over the repo-backed model.
- You can keep raw files and migrate to another parser, static pipeline, or
  database import script if Flatbread stops fitting the project.

## Current limitations

- JSON/CSV export is available through the API, not a CLI command.
- CSV is a flat view: nested object fields are omitted, and relation fields are
  exported as reference IDs rather than expanded records.
- Generated TypeScript read helpers execute through the GraphQL layer today.
- Live content/config reload is available through `flatbread start --watch`;
  package-code changes still require their own rebuild or restart. See
  [local dev loop boundaries](./local-dev-loop.md).
