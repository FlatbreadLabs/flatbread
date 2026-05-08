# Flatbread relational primitives

Flatbread's core product model is a typed relational content graph backed by files in Git. These definitions give product, docs, validation, generated types, and examples one shared vocabulary without implying that Flatbread is a full database or CMS.

## Collection

A **collection** is a named group of records loaded from one content path or glob. Collections are declared in `flatbread.config.js` through `content[]` entries:

```js
{
  path: 'content/markdown/posts',
  collection: 'Post',
  refs: { authors: 'Author' },
}
```

Use collections for stable content concepts such as `Post`, `Author`, `PostCategory`, `Decision`, or `Artifact`.

## Record

A **record** is one loaded content item inside a collection. For Markdown and YAML sources, a record usually corresponds to one source file plus parsed frontmatter/body fields. Records are the units that Flatbread exposes through query interfaces.

## ID

An **ID** is the stable identifier for a record. IDs should be predictable, unique inside the relevant collection, and safe to reference from other records. When ID normalization is tightened, the same rules should apply across source files, internal content, GraphQL arguments, generated TypeScript types, and future query APIs.

## Relation

A **relation** is a named reference from records in one collection to records in another collection. Relations are declared with `refs` in config and represented in content by IDs:

```js
{
  path: 'content/markdown/posts',
  collection: 'Post',
  refs: {
    authors: 'Author',
  },
}
```

Relations are Flatbread's main differentiator over isolated file loaders: they let flat files behave like a coherent content graph while remaining plain files in Git.

## Cardinality

**Cardinality** describes how many records a relation may point at:

- **one-to-one:** one record points to one record, such as an author profile pointing to a best friend.
- **one-to-many:** one record points to multiple records, such as a post listing its authors.
- **many-to-many:** records on both sides may point across a shared concept, such as posts and tags.

Flatbread should document and validate supported shapes explicitly so ambiguous relation data fails early with useful diagnostics instead of surprising query behavior.

## Validation

**Validation** is the pre-query check that content and config form a coherent model. Validation should catch issues such as:

- duplicate IDs,
- missing relation targets,
- invalid relation shapes,
- unsupported cardinality,
- required field gaps, and
- source context that is too ambiguous for a developer to fix quickly.

Validation is not a promise of database constraints or transactional writes. It is a local correctness layer for file-backed content before generated schema/API use.

## Query interface

A **query interface** is any supported way to read the same content model. GraphQL is Flatbread's current production interface. Generated TypeScript APIs and agent-oriented query surfaces can sit alongside GraphQL if they preserve the same collection, record, ID, relation, cardinality, and validation semantics.

## Canonical example terms

The docs and examples should use the same starter model:

- `Post` collection: Markdown records under `content/markdown/posts`.
- `Author` collection: Markdown records under `content/markdown/authors`.
- `PostCategory` collection: category-derived Markdown records.
- `Post.authors` relation: a post references one or more author IDs.

This "posts, authors, tags/categories" path demonstrates Flatbread as a relational content layer first. GraphQL appears after the model is clear, as one interface over that model.
