# Flatbread Flow PMF Audit

Generated from the DAG task runner audit on May 7, 2026.

> This report records the repository as it was in May 2026. It is background
> research, not current setup instructions. For the current development steps
> and watch behavior, see [Local development loop](./docs/local-dev-loop.md).

**Buyer-facing comparison rubric** (SQLite, CMS, Contentlayer-like, agent-artifact workflows; issue #144 acceptance-style criteria): [docs/pmf-decision-rubric.md](./docs/pmf-decision-rubric.md).

Canvas: `file:///Users/tonyketcham/.cursor/projects/Users-tonyketcham-Code-Github-personal-flatbread/canvases/dag-flatbread-pmf-audit.canvas.tsx`

## Executive Summary

Flatbread has the strongest product-market-fit path as a Git-native relational content layer for developer-authored Markdown/YAML and similar flat-file content. It looks much weaker if positioned as a general relational flat-file database, because developers will compare it against SQLite, Prisma/Drizzle, embedded databases, CMSs, Airtable/Notion exports, and local-first data stores.

The core issue is that the current product flow is GraphQL-first and appears GraphQL-required for the main developer path: schema generation, querying, filtering, relations, runtime server access, and TypeScript codegen all run through GraphQL concepts or artifacts. That can be a wedge for teams that already want a content graph, but it narrows appeal for developers who simply want typed relational data in flat files.

Recommended positioning:

> Flatbread is a Git-native relational content layer for TypeScript apps: model collections and relationships over flat files, query them with GraphQL or generated TypeScript APIs, and keep full ownership of your data in Git.

## Current Flow

The audited flow is roughly:

1. Define sources and transformers over local files.
2. Infer or generate collections, fields, and relations.
3. Generate a GraphQL schema.
4. Serve the schema through Apollo/Express or use a provider wrapper.
5. Query data through GraphQL documents or raw GraphQL strings.
6. Optionally run GraphQL Code Generator to emit TypeScript artifacts.

Evidence of GraphQL centrality:

- `packages/core/src/generators/schema.ts` builds GraphQL object types, resolvers, and query fields from Flatbread collections.
- `packages/core/src/providers/base.ts` exposes a provider query path around `graphql(...)`.
- `packages/core/src/resolvers/arguments.ts` resolves filters by constructing and executing internal GraphQL queries.
- `packages/flatbread/src/graphql/server.ts` builds and serves an Apollo GraphQL server.
- `packages/codegen/src/generator.ts` uses GraphQL Code Generator over printed schemas and `.graphql` documents.
- `examples/nextjs/generated/graphql.ts` contains `TypedDocumentNode` GraphQL artifacts.
- `examples/nextjs/lib/graphql.ts` and `examples/sveltekit/src/routes/+page.js` call `/graphql` directly.
- `packages/flatbread/README.md`, `packages/source-filesystem/README.md`, and `packages/transformer-markdown/README.md` frame the product around querying content with GraphQL.

## PMF Gaps

### 1. GraphQL Is The Product Interface, Not Just An Adapter

Severity: High

Flatbread currently asks users to understand GraphQL schema, queries, filters, documents, codegen, and a server endpoint early in the experience. That is fine for GraphQL-positive teams, but it is a major adoption filter for developers whose job is "store relational data in flat files."

Product implication: Make GraphQL explicit as one interface, not the whole product. Add a generated TypeScript API or object query layer that lets developers consume relational flat-file data without operating a GraphQL sidecar.

### 2. The Relational Data Model Is Implied More Than Taught

Severity: High

The repo has evidence of collections, references, filters, and nested relations, but the first-time mental model is still "files become GraphQL" more than "flat files become typed relational collections." Developers evaluating data tooling need clear primitives: collections, records, IDs, references, cardinality, constraints, validation, and query semantics.

Product implication: Document relational modeling as the core concept. Make "posts -> authors -> tags" the canonical first win and explain the backing files, generated schema, and query APIs from that model.

### 3. Write, Mutation, And Data Management Workflows Are Missing

Severity: High

Flatbread appears strongest as a read/query layer over local content. For developers who hear "relational data in flat files," the missing pieces are writes, updates, safe edits, bulk import/export, conflict handling, and explicit ownership guarantees.

Product implication: Either keep positioning focused on read-mostly content graphs, or add a deliberate write/editing story. Avoid sounding like a database replacement until the write path exists.

### 4. Constraints And Integrity Guarantees Are Not First-Class

Severity: High

Relational storage buyers expect duplicate ID detection, missing reference errors, relation shape validation, uniqueness, required fields, and useful diagnostics. The current evidence points to flexible GraphQL/runtime behavior and loose core content typing rather than a strong integrity layer.

Product implication: Add relation validation and schema validation before expanding the surface area. Flat files become compelling when the product catches broken references before production.

### 5. The Local-First Dev Loop Is Incomplete

Severity: Medium-High

Flatbread is naturally local-file-backed, but the docs indicate runtime content change detection is not supported and requires restart. Codegen has watch behavior, but the content loading, schema rebuild, server, and framework examples do not yet tell one crisp "edit file, see app update" story.

Product implication: Prioritize a unified watch mode that reloads content, rebuilds schema, regenerates types, and updates examples without manual restarts.

### 6. Type Safety Arrives Too Late

Severity: Medium-High

Generated GraphQL artifacts provide useful TypeScript result types, but config typing, content typing, and ID semantics are weaker. Core content still exposes loose surfaces such as arbitrary keyed content, and GraphQL query args appear to flatten IDs into strings.

Product implication: Generate or infer types from Flatbread config and content schemas before GraphQL documents enter the picture. Normalize ID handling across files, relations, GraphQL, and generated APIs.

### 7. Onboarding Is Fragmented

Severity: Medium

There is no root `README.md` anchoring the user journey. Guidance is split across `CONTRIBUTING.md`, root `package.json`, package READMEs, and example READMEs. The commands and concepts include `pnpm play`, `pnpm dev`, `npx flatbread init`, `npx flatbread codegen`, `.graphql` documents, codegen plugins, and a separate GraphQL server before the product promise is fully established.

Product implication: Create one canonical quickstart that starts from a relational flat-file example and reaches a typed query result quickly.

### 8. Portability Is Under-Explained

Severity: Medium

Flat files imply data ownership, but the current product story does not clearly expose import/export, snapshots, CSV/JSON output, schema export, backup, or migration paths. Export mainly happens through GraphQL responses or generated TypeScript artifacts.

Product implication: If pursuing broader relational data, add explicit import/export tooling. If staying content-focused, document raw files, Git, GraphQL introspection, and generated types as the portability story.

### 9. Positioning Is Broader Than The Evidence Supports

Severity: Medium

The repo evidence is strongest for Markdown/YAML content, framework examples, image/content transformers, GraphQL querying, and TypeScript codegen. It is weaker for a general-purpose relational flat-file data platform.

Product implication: Avoid database replacement framing. Lead with "content graph in your repo" and "relations without a CMS."

## Recommended Roadmap

### Near Term

- Tighten config typing and reduce loose `any` surfaces where developers define content models.
- Normalize ID handling across internal models, GraphQL arguments, and generated types.
- Add relation validation with clear diagnostics for missing targets, duplicate IDs, invalid shapes, and unsupported cardinality.
- Ship one polished demo where editing Markdown/YAML relations locally updates typed relational queries immediately.
- Rewrite docs around relational modeling patterns before GraphQL API usage.

### Next

- Add generated TypeScript accessors alongside GraphQL.
- Add content watch mode across loaders, schema generation, codegen, and examples.
- Provide relation-aware examples for common app shapes: blog authors, product catalog, docs navigation, changelog/releases.
- Add JSON and CSV snapshot export for collections.

### Later

- Add framework adapters after the core local filesystem workflow feels excellent.
- Add migration/import guides from hand-rolled Markdown/YAML, Contentlayer-like systems, Airtable exports, Notion exports, and static data folders.
- Add indexing or richer filtering only when real projects expose performance limits.

## Agent Artifact Opportunity

Severity: Medium (strategic option; validates existing near-term gaps rather than inventing new unrelated work)

Agent harnesses emit large markdown artifacts but rarely persist them as a **typed graph** tied to a single effort (feature, spike, or research thread). The 2026 landscape mixes manifests (`AGENTS.md`), handoff folders, memory-as-VCS (e.g. GCC-style trees), and vault MCPs with search—but almost nowhere gets **reference integrity, stable IDs, and relational queries** over those files.

Flatbread can pivot query surfaces beyond GraphQL-only by positioning as **the relational layer for agent efforts in git**: collections and refs over markdown/YAML, with **MCP and generated TypeScript** as agent-first adapters alongside GraphQL. That use case **raises the priority** of work already called out near term—config typing, ID normalization, relation validation, and watch mode—and stays compatible with “no hosted CMS/UI yet” if writes stay narrow (e.g. append-oriented artifact deposits).

Full survey, five-layer SOTA map, product postures (including recommended **Effort Graph**), schema sketch, validation experiments, and explicit tensions with this audit’s “What Not To Build Yet” list: **[flatbread-agent-artifact-opportunity.md](./flatbread-agent-artifact-opportunity.md)**.

## Near-Term Experiments

- Relational starter benchmark: can a developer model `posts -> authors -> tags` in under 10 minutes and query it safely?
- Watch-mode demo: does editing a flat file update app data without restart or manual codegen?
- Type-safety test: where do TypeScript users still hit weak inference, `any`, or confusing generated types?
- Exit-story test: does one-command `flatbread export json/csv` increase trust in adoption interviews?

## What Not To Build Yet

- Do not build a hosted CMS, dashboard, or editing UI yet.
- Do not compete with full databases on transactions, auth, permissions, or high-scale writes.
- Do not over-invest in many source plugins before the local filesystem relational workflow is excellent.
- Do not keep GraphQL as the only story if the ICP is broader than GraphQL-positive content teams.
- Do not add complex migration systems before schemas, IDs, validation, exports, and local watch behavior are settled.

## Bottom Line

Flatbread should not currently chase "relational data in flat files" as a broad category. The sharper wedge is:

> Git-native relational content for TypeScript apps, backed by flat files, with GraphQL and generated types when teams want them.

The highest-leverage PMF work is to make GraphQL's role explicit, teach the relational content model directly, add validation and type guarantees around file-backed relations, and make the local edit/query loop excellent.
