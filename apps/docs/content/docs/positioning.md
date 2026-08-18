---
id: positioning
title: What Flatbread is
section: start
order: 1
summary: Flatbread turns files in Git into a typed relational graph. Collections, records, and refs come first; GraphQL is one way to read them.
related:
  - glossary
  - pmf-decision-rubric
---

# What Flatbread is

**Next action (1 minute): choose the path that matches your goal.**

- For coding-agent memory, open the [Proof guide](../../../../packages/proof/README.md).
- For relational content, open the [Quickstart](../../../../packages/flatbread/README.md#quickstart-posts-authors-and-tags).

Flatbread turns files in Git into a typed relational graph. Collections group
records, and `refs` link one record to another. Flatbread reads those files
through source and transformer plugins.

Generated TypeScript and [GraphQL](https://graphql.org/) operations are ways
for an app to read the graph. They are not the product itself.

## The lead use case: memory for coding agents

Proof records what a coding agent learns while it works:

- Work and conclusions: Efforts, Issues, Findings, and Decisions.
- Guardrails and evidence: Constraints, Risks, Citations, and Blobs.

Each record is a Markdown file under `.flatbread-proof/`. You can commit,
diff, review, and revert it like source code. The next session can read why the
last session made a choice.

Writes use `flatbread proof write '<json>'`. Reads stay bounded:

- Browse with `flatbread proof list`, `flatbread proof records <effort-id>`, or
  `flatbread proof relations <effort-id> <record-id> --relations <name>`.
- Focus with `flatbread proof blocking-decisions <effort-id>` or
  `flatbread proof get <record-id>`.

## The general case: relational content

Proof is one model on a general engine. The same collections, `refs`, filters,
and generated types support sites, docs, and internal tools. Posts can point at
authors, and authors can point at each other.

**Who it is for:** People building coding agents that need memory a human can
review in Git, and teams building TypeScript sites, internal tools, and starter
projects that want versioned, reviewable content and links between entries
without setting up a CMS database.

**What Flatbread does not do:**

- It is not a hosted CMS, dashboard, or writing UI.
- It is not a general-purpose GraphQL platform or database. Transactions,
  detailed access control, and many concurrent writers are outside its scope.
- It does not reload its own packages.
  [`flatbread start --watch`](./local-dev-loop.md) picks up valid content and
  config changes, but a change to a Flatbread package needs a rebuild and a
  restart.

## Choose a read interface

Start with files and configuration. Then choose how the app reads the graph.
In the default GraphQL setup, the path is
`schema → operations → codegen`.

If you already use GraphQL, read about
[`refs` and relations](./glossary.md#relation), then run the codegen command in
your app's Flatbread docs.

## Keep your data

Raw files stay in Git, so you can branch, review,
revert, and move content without asking a hosted CMS for an export. JSON and
CSV exports make reviewable snapshots. GraphQL documents and generated
operation types show the read shapes your app used. The generated read API is a
convenience layer; files, snapshots, documents, and operation types are easier
to take to another tool.

## More detail

- Install and use Flatbread: [main README](../../../../README.md).
- Compare it with databases and CMSs: [Compared with other tools](./pmf-decision-rubric.md).
- Plan an exit or export: [Data ownership](./data-ownership.md).

Next: spend 2 minutes on the [glossary](./glossary.md), starting with
Collection, Record, and Relation.
