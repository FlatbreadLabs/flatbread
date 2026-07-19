# Flatbread positioning

For installation and usage, see the [main README](../README.md). For
definitions used in the docs and config, see the [glossary](./glossary.md).
To compare Flatbread with databases, CMSs, and other file-based tools, see
[Comparing Flatbread with other tools](./pmf-decision-rubric.md). For keeping
and moving your data, see [data ownership](./data-ownership.md).

Turn files in Git into typed, related content for your TypeScript app. A
Flatbread project has collections, records, and `refs` that link records.
Generated types and [GraphQL](https://graphql.org/) operations are common ways
for an app to read that data; they do not define what Flatbread is.

**Flatbread** reads content from your repository and file system. Plugins
control how it reads files and turns them into data.

**Who it is for:** Teams building TypeScript sites, internal tools, and starter
projects that want versioned, reviewable content and links between entries
without setting up a CMS database.

**What Flatbread does not do:**

- It is not a hosted CMS, dashboard, or writing UI.
- It is not a general-purpose GraphQL platform or database. Transactions,
  detailed access control, and many concurrent writers are outside its scope.
- [`flatbread start --watch`](./local-dev-loop.md) reloads valid content and
  config changes. Changes to Flatbread packages still need their own rebuild or
  restart.

**GraphQL:** In the default setup, GraphQL reads data that Flatbread has already
loaded (`schema → operations → codegen`). Start with files and configuration,
then choose how your app reads the data. The
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
