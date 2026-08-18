---
id: glossary
title: Glossary
section: start
order: 2
summary: The words Flatbread uses — collection, record, ref, relation, transformer, source — each defined in one place.
related:
  - positioning
---

# Flatbread glossary — relational content primitives

**Next action (2 minutes): read [Collection](#collection), [Record](#record),
and [Relation](#relation) first.**

Flatbread turns repository files into related data that a TypeScript app can
read. It is not a hosted CMS, a writing interface, or a general-purpose
database. [GraphQL](https://graphql.org/) is one read interface, not the
definition of Flatbread.

## Core model

### Collection

A **collection** is a named group of content of the same kind. The Flatbread
config usually maps it to a folder, such as `content/posts`. A collection is a
model over files in Git, not a database table or hosted content bucket.

### Record

A **record** is one loaded item in a collection. It is the document-shaped
result of reading a file: metadata, body, and derived fields. It is not a row
in a remote database.

### ID

An **ID** points to one record in a collection so relations can resolve. IDs
connect the graph inside the repository; they are not a remote primary-key
service.

Current rules:

- Valid IDs are non-empty strings or finite numbers.
- String IDs are trimmed; `id: " 123 "` normalizes to `"123"`.
- Record lookups, `refs`, equality filters, and membership filters compare the
  normalized string form. A record ID `123` matches GraphQL ID `"123"` or
  integer literal `123`. Ordered filters such as `lt` and `gt` keep normal
  scalar comparison.
- Empty strings, `null`, `undefined`, booleans, objects, `NaN`, and infinite
  numbers are invalid IDs.
- Flatbread reports multiple invalid IDs together and rejects duplicates after
  normalization, such as `123` and `"123"` in one collection.

### Relation

A **relation** is a configured link from one collection to another. For
example, `refs` can map a post's `author` field to the `Author` collection.
Relations connect flat-file records; a database server does not manage them.

### Cardinality

**Cardinality** says whether a relation resolves to one record or many. It
changes the generated read shape but does not imply a SQL database.

- **One-to-one:** one ID, such as `author: 2a3e`, resolves to one record.
- **One-to-many:** an ID list, such as `authors: [2a3e, 40s3]`, resolves to a
  record list.
- **Many-to-many:** each collection stores its own ID list; Flatbread does not
  infer a hidden join table or reciprocal edge.
- **Invalid:** booleans, objects, nested arrays, and other non-ID shapes fail
  validation before schema use instead of resolving to `null`.

## Files into records

### Source

A **source** plugin finds and loads input files. The configured content paths
tell it which files belong to each collection.

### Transformer

A **transformer** plugin parses a loaded file into fields that Flatbread can
store on a record. Markdown and YAML transformers turn file content into the
same collection model.

### Reading records

Flatbread reads source files into records and adds details such as `_path` and
`_filename`. It validates the records and decides which configured content path
owns each file.

### Tag (facet) vs `Tag` collection

A **facet** is metadata on a record. For example, `tags: [a, b]` becomes a
scalar list in the read interface.

A **`Tag` collection** stores one record per tag. Use `refs` from `Post` to
`Tag` when tags need shared descriptions, stable IDs, or relations of their
own.

## Read interfaces and checks

### Query interface

A **query interface** is how the app reads Flatbread data. Many projects use a
GraphQL schema and operations with codegen. GraphQL reads the model; it does
not define the model.

### Generated schema and operation types (GraphQL)

The generated GraphQL schema exposes collections as fields such as `allPosts`
and `allAuthors`. Nested selections follow `refs` and return related records.
Frontmatter lists such as `tags` stay scalar lists unless you model a separate
`Tag` collection.

GraphQL document codegen can produce TypeScript operation results such as
`GetPostsAuthorsAndTagsQuery`. Those types describe one read interface. The
records and relations still come from repository files and config.

### Validation

**Validation** checks that the Flatbread config, plugin wiring, IDs, refs, and
loaded graph are consistent enough to read. It reports broken references,
duplicate IDs, and unsupported relation shapes before schema use. It does not
promise every database constraint or editorial rule that a CMS could enforce.

For a tool comparison, read [Compared with other tools](./pmf-decision-rubric.md).

Next: open [Flatbread positioning](./positioning.md) and read “What Flatbread
is.”
