# Flatbread positioning

For installation and usage, see the [main README](../README.md). For
definitions used in the docs and config, see the [glossary](./glossary.md).
To compare Flatbread with databases, CMSs, and other file-based tools, see
[Comparing Flatbread with other tools](./pmf-decision-rubric.md). For keeping
and moving your data, see [data ownership](./data-ownership.md).

Flatbread turns files in Git into a typed relational graph. A project has
collections, records, and `refs` that link records. Generated types and
[GraphQL](https://graphql.org/) operations are common ways for an app to read
that graph; they do not define what Flatbread is.

**Flatbread** reads content from your repository and file system. Plugins
control how it reads files and turns them into data.

## The lead use case: memory for coding agents

The [Effort Graph](../packages/effort-graph/README.md) is a Flatbread content
model for what a coding agent works out along the way. An agent records an
Effort and then writes Issues, Findings, Decisions, Constraints, Risks,
Citations, and Blobs against it. Each record is a markdown file under
`.flatbread-efforts/`, so it is committed, diffed, reviewed, and reverted like
source. Writes go through `flatbread effort write`; reads come back as bounded
digests from `flatbread effort list`, `records`, `relations`,
`blocking-decisions`, and `get`.

That solves a plain problem: an agent that closes its session forgets why it
chose what it chose. Putting the reasoning in the repository keeps it next to
the code it explains, and keeps it readable by a person.

## The general case: relational content

Everything above is one content model on a general engine. The same
collections, `refs`, filters, and generated types back sites, docs, and
internal tools. Posts point at authors; authors point at each other. Model your
own collections and you get the same typed graph.

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

**GraphQL:** GraphQL is one read interface over the graph. In the default setup
it reads data that Flatbread has already loaded, following
`schema → operations → codegen`. Start with files and configuration, then
choose how your app reads the data. The
[Quickstart](../packages/flatbread/README.md#quickstart-posts-authors-and-tags)
shows posts, authors, and tags from files through generated types.

**Keeping your data:** Raw files stay in Git, so you can branch, review,
revert, and move content without asking a hosted CMS for an export. JSON and
CSV exports make reviewable snapshots. GraphQL documents and generated
operation types show the read shapes your app used. The generated read API is a
convenience layer; files, snapshots, documents, and operation types are easier
to take to another tool.

**If you already use GraphQL:** Read about [`refs` and relations](./glossary.md#relation),
then use your app's `flatbread codegen` documentation. The files and
configuration come before the queries you write.
