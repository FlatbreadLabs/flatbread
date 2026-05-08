# Flatbread positioning

Flatbread positions itself the same way across the repo; this page is a stable link target. For install and usage, see the [main README](../README.md). For vocabulary used across docs and config—**collections**, **relations**, **IDs**, and how a **query interface** fits in—see the [glossary](./glossary.md). For **buyer-aware comparisons** (SQLite-style workflows, CMSs, Contentlayer-like stacks, agent artifact graphs) across setup time, typing, integrity, and related criteria—plus **go / no-go** guidance for an agent-artifact wedge—see the [PMF decision rubric](./pmf-decision-rubric.md). For portability and exit paths, see [data ownership](./data-ownership.md).

Turn flat files in Git into typed, relational content for your TypeScript app. The core artifact is an in-repo **content graph** (collections, records, **`refs`**). **Generated types plus [GraphQL](https://graphql.org/) operations** layer on top today as the most common **read interface** — they describe how many apps consume that graph at build/run time; they do not redefine what Flatbread **is**.

**Flatbread** is a Git-native relational flat-file content layer for TypeScript apps. Your repo and filesystem are the source of truth; plugins (sources, transformers, and resolvers) extend how content is loaded and shaped.

**Who it's for:** Teams shipping TypeScript sites, internal tools, and starters who want **versioned, reviewable content** and **relationships between entries**—without standing up a CMS database or giving up ownership of where content lives.

**Non-goals:**

- Not a hosted CMS, dashboard, or authoring UI: Flatbread is a library and local workflow, not a full content-management product you log into.
- Not a general-purpose GraphQL platform or a substitute for a general-purpose database (transactions, granular access control, and high-scale multi-writer workloads are out of scope).
- Reliable live reload of content while the dev server runs is [not a supported pillar yet](https://github.com/FlatbreadLabs/flatbread/issues/65); expect to restart to pick up file changes.

**GraphQL:** In the default setup, GraphQL is a primary **interface** for reading an already-loaded content graph (`schema → operations → codegen`). Prefer thinking **files → model → typed read path** rather than treating GraphQL alone as Flatbread. For **traceability** from **backing files** (posts, authors, tag facets on posts) through **config** to generated schema and operation types—aligned with the [glossary](./glossary.md)—see the **Quickstart** and **Traceability** sections of [`packages/flatbread/README.md`](../packages/flatbread/README.md#quickstart-posts-authors-and-tags).

**Portability and exit:** Raw files stay in Git, so content can be branched, reviewed, reverted, and migrated without asking a hosted CMS for a dump. JSON and CSV exports provide reviewable snapshots with normalized IDs and refs; GraphQL introspection and generated operation types preserve the read shapes your app used. The prototype generated read API is convenient inside Flatbread, while raw files, snapshots, GraphQL documents, and operation types are the durable exit surfaces.

**Skimming from GraphQL-first experience:** Jump to **`refs` + relations** in [glossary](./glossary.md), then codegen and your app’s **`flatbread codegen`** docs — the relational layer is upstream of the queries you write.
