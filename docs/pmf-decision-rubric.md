# PMF decision rubric: content layer, database, CMS, or Effort Graph

Use this rubric when deciding whether Flatbread should be framed as a relational content layer, a database alternative, a CMS alternative, a Contentlayer-like workflow, or an agent artifact / Effort Graph product wedge.

The default recommendation remains:

> Flatbread is a Git-native relational content layer for TypeScript apps, backed by flat files, with GraphQL and generated types when teams want them.

## Comparison criteria

| Criterion                      | SQLite-style database workflow                                                       | Hosted/headless CMS workflow                                                                       | Contentlayer-like content workflow                                            | Agent artifact / Effort Graph workflow                                                | Flatbread go/no-go signal                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Setup time                     | Strong if the app already uses SQL/ORMs; heavy if the user only needs local content. | Usually slower because it introduces accounts, projects, schemas, API tokens, and hosted services. | Fast for Markdown-first apps.                                                 | Fast if it can map existing harness folders without migration.                        | Flatbread should win when a repo-local `posts/authors/tags` or `efforts/plans/decisions` model is queryable in minutes.     |
| Type safety                    | Strong with mature ORMs, migrations, and generated clients.                          | Varies by SDK and schema export.                                                                   | Strong for local content shapes, often weaker for cross-collection integrity. | Usually weak today; artifacts are mostly Markdown plus search.                        | Flatbread should continue only if generated types and relation semantics become clearer than hand-rolled file loaders.      |
| Relation modeling              | Full relational power, but with database vocabulary and operational expectations.    | Good when schema builders support references, but ownership lives outside Git.                     | Often basic references or computed links.                                     | Missing first-class typed edges across efforts, plans, sessions, and decisions.       | Flatbread should lead with collections, records, IDs, refs, and cardinality while avoiding database replacement claims.     |
| Reference integrity            | Strong in databases; backed by constraints.                                          | Often strong inside the CMS.                                                                       | Mixed; broken links can become runtime/content bugs.                          | Mostly absent; broken links are hard to detect before retrieval.                      | Flatbread must add duplicate-ID and missing-reference diagnostics before broadening the promise.                            |
| Portability                    | Data can be dumped, but format and migrations are database-specific.                 | Export depends on vendor and plan.                                                                 | Strong because source files live in the repo.                                 | Strong if the graph maps existing artifacts without moving them.                      | Flatbread should emphasize raw files, Git review, generated interfaces, and JSON/CSV snapshot exports.                      |
| Local development loop quality | Mature if local DB/bootstrap is well documented.                                     | Often slower due remote services or sync.                                                          | Usually excellent for static content.                                         | Harness artifacts update constantly; stale indexes hurt quickly.                      | Flatbread needs a documented watch loop for content reload, schema rebuild, codegen, and framework restarts.                |
| Agent query ergonomics         | Agents can query through app code, but SQL/ORM context may be overkill.              | Agents need vendor APIs and credentials.                                                           | Agents can read files but lack typed traversal.                               | Core need: answer effort-centric questions without stuffing all history into context. | Agent artifacts should become a primary wedge only if MCP/TS queries over an Effort Graph beat cold-start context stuffing. |

## Decision signals

### Keep Flatbread centered as a content layer when:

- the strongest demos involve Markdown/YAML files in Git;
- users value reviewable source data more than hosted editing UI;
- relation validation and generated types reduce hand-rolled content code; and
- GraphQL remains useful as an interface but not required as the first mental model.

### Do not position Flatbread as a database replacement when:

- the workload needs transactions, locking, auth, permissions, or high-scale writes;
- users expect migrations, indexes, and query planning as the main product surface; or
- the acceptance criteria would be better met by SQLite, Prisma, Drizzle, or Postgres.

### Do not position Flatbread as a full CMS replacement when:

- users need hosted editing, roles, preview workflows, asset management, or publishing approvals;
- source ownership is less important than editorial UI; or
- schema and content changes happen outside Git.

### Treat agent artifacts as a secondary vertical when:

- the model only works for one harness layout;
- useful answers still require custom scripts per repo;
- typed relations add little beyond keyword search; or
- agent-facing surfaces require a broad write/update API before validation is proven.

### Promote Effort Graph to a primary wedge when:

- one schema plus a thin mapping layer survives Cursor, Claude Code, and GCC-style layouts;
- queries such as "blocking decisions for this effort with plan/session context" work through one retrieval surface;
- token or continuity benchmarks beat cold-start context stuffing; and
- the implementation reinforces core Flatbread primitives: IDs, refs, validation, generated types, watch mode, and portability.

## Current roadmap implication

The product should keep GraphQL as a supported adapter, but prioritize the foundations that all winning postures require:

1. relational primitive docs and quickstart alignment,
2. normalized ID semantics,
3. missing-reference and duplicate-ID validation,
4. generated TypeScript schema/read APIs, and
5. JSON/CSV/export and data ownership docs.

The agent artifact opportunity should remain an evidence-driven option until the wire-up, adversarial schema, and cold-start benchmark experiments are complete.
