# Flatbread positioning

Flatbread positions itself the same way across the repo; this page is a stable link target. For install and usage, see the [main README](../README.md).

Turn flat files in Git into typed, relational content for your TypeScript app—with [GraphQL](https://graphql.org/) and generated types as the default way to query the model today.

**Flatbread** is a Git-native relational flat-file content layer for TypeScript apps. Your repo and filesystem are the source of truth; plugins (sources, transformers, and resolvers) extend how content is loaded and shaped.

**Who it's for:** Teams shipping TypeScript sites, internal tools, and starters who want **versioned, reviewable content** and **relationships between entries**—without standing up a CMS database or giving up ownership of where content lives.

**Non-goals:**

- Not a hosted CMS, dashboard, or authoring UI: Flatbread is a library and local workflow, not a full content-management product you log into.
- Not a general-purpose GraphQL platform or a substitute for a general-purpose database (transactions, granular access control, and high-scale multi-writer workloads are out of scope).
- Reliable live reload of content while the dev server runs is [not a supported pillar yet](https://github.com/FlatbreadLabs/flatbread/issues/65); expect to restart to pick up file changes.

**GraphQL:** In the default setup, GraphQL is the primary **interface** for reading the content graph—schema generation and codegen are how many apps reach the data, not the definition of the product.
