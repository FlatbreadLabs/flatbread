---
id: data-ownership
title: Data ownership
section: data
order: 1
summary: Your files stay in Git. What that buys you, and how to take the data somewhere else.
related:
  - json-export
---

# Data ownership and exit story

**Next action (2 minutes): choose an exit path from the two tables below.**

Your flat files remain the source of truth. Markdown, YAML, and other source
files stay in the repository, move through normal Git workflows, and remain
readable without a hosted dashboard.

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

## Take the content elsewhere

| Surface        | What it gives you                                                                | Exit use                                                                  |
| -------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Raw files      | Original Markdown/YAML content and frontmatter                                   | Move to another static/content pipeline without export first              |
| Git history    | Reviewable content lineage                                                       | Audit, revert, or migrate by commit range                                 |
| JSON snapshots | Stable collection records with normalized IDs/refs                               | Feed another app, script, archive, or migration                           |
| CSV flat views | Spreadsheet-friendly scalar fields and reference IDs; nested objects are omitted | Review simple collections, hand off to non-developers, seed tabular tools |

## Preserve read contracts

| Surface               | What it gives you                      | Exit use                                                                         |
| --------------------- | -------------------------------------- | -------------------------------------------------------------------------------- |
| GraphQL introspection | The generated read schema              | Discover API shape or generate external clients while Flatbread serves the graph |
| Generated TypeScript  | Operation types and model helper types | Preserve typed query/result contracts while changing framework integration       |

## JSON and CSV exports

If your config already loads, adding an export call takes about 10 minutes.
`@flatbread/core` exposes these APIs:

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
duplicate IDs stop the export before it creates a snapshot.

See [snapshot export docs](./json-export.md) for sort order, path behavior,
relation handling, and CSV flattening details.

## GraphQL schema and generated types

GraphQL is one read interface over the same repo-backed model. While a
Flatbread server is running, standard GraphQL tooling can introspect
`http://localhost:5057/graphql` to discover the generated schema. The checked-in
GraphQL documents and generated TypeScript operation types are useful migration
artifacts because they show the read shapes your app depended on.

If you leave Flatbread, replace or reimplement the prototype generated read
API. The durable exit surfaces are the raw files, JSON/CSV snapshots, GraphQL
operation documents, and operation result types.

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
  package-code changes still require their own rebuild or restart.

Next: open the [local dev loop boundaries](./local-dev-loop.md) and check which
changes need a restart.
