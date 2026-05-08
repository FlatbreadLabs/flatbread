# Flatbread glossary — relational content primitives

This page defines vocabulary for Flatbread’s **Git-native, flat-file relational content layer** for TypeScript apps. Flatbread turns files in your repo into a coherent **content graph** you can read from your application; it is **not** a hosted CMS, a full authoring product, or a general-purpose database.

**[GraphQL](https://graphql.org/)** is often the **default query interface** in typical setups, but it is one way to read the graph—not the product’s whole identity.

See also: [Flatbread positioning](./positioning.md); [PMF decision rubric](./pmf-decision-rubric.md) (comparative criteria and agent-wedge signals).

---

### Cardinality

How many related items a field connects—whether a relation resolves to **one** related entry or **many** (for example, a single author versus a list of tags). Cardinality shapes how the graph is exposed to your app (including generated GraphQL fields); it does **not** imply a SQL-style database engine.

### Collection

A **named group** of content of the same kind, declared in your Flatbread config and usually mapped to a folder of source files (for example, all posts under `content/posts`). A collection is a **modeling unit** over files in Git, not a database table or a hosted content bucket.

### ID

An identifier Flatbread uses to **point at one item within a collection** so relations can resolve. Today, Flatbread expects loaded entries to expose an `id`-shaped value that query arguments and `refs` can compare against; future ID work should keep that rule explicit across files, generated types, and query interfaces. IDs wire the graph together **in the repository**; they are not a centralized “primary key service” like a server database would provide.

### Query interface

The **API surface your application uses to read** the built content graph. In many projects today that surface is **GraphQL** (schema plus operations, often with codegen), meaning GraphQL is **an interface**, not the definition of Flatbread. Other ways to consume the same graph may exist in your stack alongside it.

### Record

**One loaded item** in a collection: the structured result of reading a file (metadata, body, derived fields) that your app treats as a single unit. “Record” here means **a document-shaped object in memory**, not a row in a remote database.

### Relation

A **configured link** from entries in one collection to another (for example, `refs` in config mapping a post field to an `Author` collection). Relations express **associations between flat-file content**, not foreign keys managed by a separate database server.

### Validation

Checks that your **Flatbread configuration, plugin wiring, and loaded content graph** are consistent enough to read safely. Near-term validation work should make broken references, duplicate IDs, and unsupported relation shapes clear before they become query-time surprises. This is still scoped to Flatbread’s content graph; it is not a promise of every database constraint or every editorial rule a CMS might enforce.
