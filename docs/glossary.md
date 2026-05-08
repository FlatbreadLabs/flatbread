# Flatbread glossary — relational content primitives

This page defines vocabulary for Flatbread’s **Git-native, flat-file relational content layer** for TypeScript apps. Flatbread turns files in your repo into a coherent **content graph** you can read from your application; it is **not** a hosted CMS, a full authoring product, or a general-purpose database.

**[GraphQL](https://graphql.org/)** is often the **default query interface** in typical setups, but it is one way to read the graph—not the product’s whole identity.

See also: [Flatbread positioning](./positioning.md); [PMF decision rubric](./pmf-decision-rubric.md) (comparative criteria and agent-wedge signals).

---

### Cardinality

How many related items a field connects—whether a relation resolves to **one** related entry or **many** (for example, a single author versus a list of tag strings on a post). Cardinality shapes how the graph is exposed to your app (including generated GraphQL fields); it does **not** imply a SQL-style database engine.

Current relation cardinality rules are intentionally small:

- **One-to-one:** a `refs` field whose content value is a single ID (`author: 2a3e`) resolves to one related record.
- **One-to-many:** a `refs` field whose content value is a list of IDs (`authors: [2a3e, 40s3]`) resolves to a list of related records.
- **Many-to-many:** model each side as one-to-many lists when both collections need to point at each other; Flatbread does not infer a hidden join table or reciprocal edge.
- **Unsupported / invalid:** booleans, objects, nested arrays, and other non-ID shapes in a `refs` field fail validation before schema use instead of silently resolving to `null`.

### Tag (facet) vs `Tag` collection

A **facet** is metadata stored on a record (often a **YAML list of strings** such as `tags: [a, b]` on a post). It becomes a **scalar list** in the read interface and is **not** the same as **`refs`** resolving to another collection. A **`Tag` collection** means one file per tag (or equivalent) and **`refs`** from **`Post`** → **`Tag`** so tag entries are **normalized records** in the graph—use that when tags need shared descriptions, stable ids, or relational edges of their own.

### Collection

A **named group** of content of the same kind, declared in your Flatbread config and usually mapped to a folder of source files (for example, all posts under `content/posts`). A collection is a **modeling unit** over files in Git, not a database table or a hosted content bucket.

### ID

An identifier Flatbread uses to **point at one item within a collection** so relations can resolve. Today, Flatbread expects loaded entries to expose an `id`-shaped value that query arguments and `refs` can compare against; future ID work should keep that rule explicit across files, generated types, and query interfaces. IDs wire the graph together **in the repository**; they are not a centralized “primary key service” like a server database would provide.

Current normalization rule: IDs may be **non-empty strings** or **finite numbers**. Flatbread compares record lookup arguments through a normalized string form, so a record with `id: 123`, a GraphQL argument `id: "123"`, and a GraphQL `ID` integer literal `id: 123` refer to the same record. Top-level equality and membership filters on a collection record’s `id` use the same normalized comparison; ordered filters (`lt`, `gt`, etc.) continue to use normal scalar comparison and should not be treated as stable ID semantics. String IDs are trimmed before comparison, so `id: " 123 "` normalizes to `"123"`. Empty strings, `null`, `undefined`, booleans, objects, `NaN`, and infinite numbers are rejected as invalid record IDs; if more than one record is invalid, Flatbread reports the invalid IDs together. Duplicate IDs after normalization (for example `123` and `"123"` in the same collection) are invalid because they would otherwise resolve inconsistently.

### Query interface

The **API surface your application uses to read** the built content graph. In many projects today that surface is **GraphQL** (schema plus operations, often with codegen), meaning GraphQL is **an interface**, not the definition of Flatbread. Other ways to consume the same graph may exist in your stack alongside it.

### Generated schema and operation types (GraphQL)

When GraphQL is your **query interface**, the **generated GraphQL schema** describes how **collections** and fields are exposed at read time: list fields such as `allPosts` / `allAuthors` correspond to **collections**; nested selections follow **`refs`** (**relations**) and resolve to related **records**; scalar list fields that come from frontmatter (for example **`tags`** on a post) align with **Tag (facet)** in this glossary—not a **`Tag` collection** unless you add one.

**Generated TypeScript** from GraphQL document codegen (for example operation result types such as `GetPostsAuthorsAndTagsQuery`) types **that read path only**. It does not redefine Flatbread’s domain model: the **records** and **relations** still originate in repo files and config. A future non-GraphQL generated TypeScript read surface, if shipped, would be documented separately so it does not blur this boundary.

### Record

**One loaded item** in a collection: the structured result of reading a file (metadata, body, derived fields) that your app treats as a single unit. “Record” here means **a document-shaped object in memory**, not a row in a remote database.

### Relation

A **configured link** from entries in one collection to another (for example, `refs` in config mapping a post field to an `Author` collection). Relations express **associations between flat-file content**, not foreign keys managed by a separate database server.

### Validation

Checks that your **Flatbread configuration, plugin wiring, and loaded content graph** are consistent enough to read safely. Near-term validation work should make broken references, duplicate IDs, and unsupported relation shapes clear before they become query-time surprises. This is still scoped to Flatbread’s content graph; it is not a promise of every database constraint or every editorial rule a CMS might enforce.
