<p align="center">
  <img src="https://raw.githubusercontent.com/FlatbreadLabs/flatbread/main/assets/brand/flatbread-mark.svg" alt="Flatbread logo" width="256" />
</p>

<h1 align="center">Flatbread</h1>

<p align="center"><strong>Context alignment, version controlled.</strong></p>

<p align="center">
  <a href="https://github.com/FlatbreadLabs/flatbread/actions/workflows/pipeline.yml">
    <img src="https://github.com/FlatbreadLabs/flatbread/actions/workflows/pipeline.yml/badge.svg" alt="pipeline status"/>
  </a>
  <a href="https://join.slack.com/t/flatbreadworkspace/shared_invite/zt-1bvnhr38j-oHFun85aGfaNp9qwizOORw">
    <img src="https://img.shields.io/static/v1?label=Slack&message=Flatbread&color=ECB22E&logo=slack" alt="Join the Flatbread slack" />
  </a>
  <a href="https://www.npmjs.com/package/flatbread">
    <img src="https://img.shields.io/npm/v/flatbread?color=%23ed225d" alt="NPM version">
  </a>
</p>

Flatbread keeps shared project context in Git so humans and coding agents
stay aligned on long-running work. The same files are a typed relational
graph that a site, docs set, or app can query.

Each Markdown or YAML file becomes a record in a named collection, and `refs`
in `flatbread.config.js` link records to each other by ID. Your files stay the
source of truth, with normal Git branches, reviews, and history. GraphQL is
one read interface over that graph, not the whole product: apps can also read
it through generated TypeScript, and coding agents read it through bounded
CLI commands.

## Choose your path

People come to Flatbread for two reasons. Pick the one that matches yours.

| Your goal                                                                       | Start here                                                        |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Give coding agents durable, reviewable project memory                           | [Path 1: Proof](#path-1-durable-memory-for-coding-agents)         |
| Build a site, documentation system, or internal tool from related content files | [Path 2: relational content](#path-2-relational-content-for-apps) |

Both paths run on the same engine: files become records, configured `refs`
become relations, and Flatbread validates the graph before exposing a read
interface. Every published package requires Node 20.19 or newer.

## Path 1: durable memory for coding agents

[Proof](https://github.com/FlatbreadLabs/flatbread/blob/main/packages/proof/README.md)
keeps coding agents and the people they work with aligned. An agent records
durable Issues, Findings, Decisions, Constraints, and Risks under an Effort —
one coherent thread of work. Each record is a Markdown file in your
repository, so the next session and your coworkers read the same reasons,
review them in a pull request, and trace how a choice changed. Nothing lives
in a private chat log or a hosted store.

1. Install the Proof skill and the matching `flatbread` package:

   ```bash
   npx --yes flatbread@latest proof install-skill
   ```

   That command downloads the latest `flatbread` CLI, pins that exact version
   as a devDependency, and copies the Proof skill that shipped with it. You
   do not copy a version number or git tag. `@latest` only chooses which CLI
   to run; the project then receives that CLI's exact version. To pin an
   older release, replace `@latest` with that version.

2. Add the Proof content model to `flatbread.config.js`, keeping any content
   entries you already have:

   ```js
   import {
     defineConfig,
     sourceFilesystem,
     transformerMarkdown,
     proofContent,
   } from 'flatbread';

   export default defineConfig({
     source: sourceFilesystem(),
     transformer: transformerMarkdown(),
     content: [
       // Keep existing entries here.
       ...proofContent(),
     ],
   });
   ```

3. Keep working state out of Git by adding two lines to `.gitignore`. The
   record files themselves stay tracked:

   ```gitignore
   **/.flatbread-proof/.journal/
   **/.flatbread/proof/read-cache/
   ```

4. Check the setup:

   ```bash
   npx flatbread proof bootstrap --verify
   ```

   A complete setup prints one JSON object with `"status":"ready"` and exits
   successfully. Bootstrap only inspects the project; it never edits files.

5. Create and read the first record:

   ```bash
   npx flatbread proof write '{"type":"CreateEffort","title":"Choose a search index","body":"Track evidence, constraints, decisions, and open work."}'
   npx flatbread proof list --status active
   ```

   The write prints the new record's ID in `artifacts[0].id`. The read prints
   a bounded JSON envelope whose `artifact_path` names a Markdown digest.

The [Proof README](https://github.com/FlatbreadLabs/flatbread/blob/main/packages/proof/README.md)
covers the record model, the write rules, and the session loop an agent
follows. The packaged
[Proof skill](https://github.com/FlatbreadLabs/flatbread/blob/main/packages/proof/skills/proof/SKILL.md)
teaches an agent those commands and its gate for deciding what deserves
durable memory.

## Path 2: relational content for apps

Use this path when Markdown or YAML files need typed links between records. A
post names its authors by ID in frontmatter, and Flatbread resolves those IDs
to `Author` records. You keep normal Git review while gaining validated links
and typed reads — joins over files, without a CMS database.

1. Install Flatbread and scaffold a config:

   ```bash
   npm install flatbread
   npx flatbread init
   ```

   `flatbread init` writes `flatbread.config.js` with `Post` and `Author`
   collections and a `refs: { authors: 'Author' }` relation.

2. Create `content/markdown/authors/ada.md`:

   ```markdown
   ---
   id: ada
   name: Ada
   ---
   ```

3. Create `content/markdown/posts/first-post.md`. Markdown below the closing
   `---` is the post body:

   ```markdown
   ---
   id: first-post
   title: First post
   authors:
     - ada
   ---

   Hello from Flatbread.
   ```

4. Start the graph server:

   ```bash
   npx flatbread start --watch
   ```

   Flatbread prints its GraphQL URL: `http://localhost:5057/graphql`.

5. From another terminal, read the relation:

   ```bash
   curl http://localhost:5057/graphql \
     -H 'content-type: application/json' \
     --data '{"query":"{ allPosts { id title authors { id name } } }"}'
   ```

   The result contains `first-post` with its resolved author
   `{ "id": "ada", "name": "Ada" }`. The files and config define that
   relation; GraphQL only reads it.

To run Flatbread beside your framework, wrap your dev and build scripts with
`flatbread start`. Everything after `--` passes through to your command.
There is no `flatbread dev` subcommand.

```json
{
  "scripts": {
    "dev": "flatbread start --watch -- next dev --turbopack",
    "build": "flatbread start -- next build"
  }
}
```

For a complete app, run the
[Next.js example](https://github.com/FlatbreadLabs/flatbread/tree/main/examples/nextjs).
It shows posts linked to authors, GraphQL document code generation with
`flatbread codegen`, and the prototype generated TypeScript read API. The
generated helpers still execute through GraphQL today.

## How Flatbread works

1. A source plugin finds files.
2. A transformer turns each file into a record.
3. `content` entries in `flatbread.config.js` group records into named
   collections, such as `Post` or `Author`.
4. `refs` connect ID fields in one collection to records in another.
5. Flatbread validates the graph and exposes read interfaces: GraphQL,
   generated TypeScript, or Proof's bounded CLI commands.

One modeling note saves confusion later: a plain string list in frontmatter,
such as `tags: [cats, measurements]`, stays a scalar `[String]` field. It is
not a relation. If tags need their own records shared across posts, model a
`Tag` collection and point a `refs` field at it. The
[glossary](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/glossary.md)
defines collections, records, IDs, relations, and cardinality.

When you want typed results in application code, run `flatbread codegen`. It
generates TypeScript types and typed document nodes for your `.graphql`
operations, plus a prototype collection-shaped read API for plain reads
without a query document at each call site. Filters, sorting, pagination, and
field overrides are documented in the
[query reference](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/query-reference.md).

## What Flatbread is not

- It is not a hosted CMS, dashboard, or writing UI.
- It is not a general-purpose database or GraphQL platform. Transactions,
  detailed access control, and many concurrent writers are outside its scope.
- It does not reload its own packages. `flatbread start --watch` picks up
  valid content and config changes while you work, but a change to a
  Flatbread package needs a rebuild and a restart. The
  [local development loop](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/local-dev-loop.md)
  maps the exact watch boundaries.

## Find the next detail

| If you need to…                                      | Read…                                                                                                 |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Understand where Flatbread fits                      | [Positioning](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/positioning.md)               |
| Learn the content vocabulary                         | [Glossary](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/glossary.md)                     |
| Set up agent memory                                  | [Proof README](https://github.com/FlatbreadLabs/flatbread/blob/main/packages/proof/README.md)         |
| Run the working example app                          | [Next.js example](https://github.com/FlatbreadLabs/flatbread/blob/main/examples/nextjs/README.md)     |
| Use filters, sorting, pagination, or field overrides | [Query reference](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/query-reference.md)       |
| Know what watch mode reloads                         | [Local development loop](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/local-dev-loop.md) |
| Keep or move your data                               | [Data ownership](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/data-ownership.md)         |
| Export JSON or CSV through the core API              | [Snapshot export](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/json-export.md)           |
| Build and test this monorepo                         | [Contributing](https://github.com/FlatbreadLabs/flatbread/blob/main/CONTRIBUTING.md)                  |

## Contributing

This monorepo uses Node 20.19+ and pnpm 10.33.x. Start with
[CONTRIBUTING.md](https://github.com/FlatbreadLabs/flatbread/blob/main/CONTRIBUTING.md),
and run `pnpm verify` before opening a pull request that changes source,
tests, package metadata, or CI.
