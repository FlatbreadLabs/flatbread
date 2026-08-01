<p align="center">
<img src="https://raw.githubusercontent.com/FlatbreadLabs/flatbread/main/assets/flatbread%20logo%20v2%20x4%401-1728x1080%20centered%20header.png"/>
</p>

<h1 align="center">Flatbread 🥪</h1>

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

<p align="center"><strong>Relational data from flat files. Memory for coding agents. No database required.</strong></p>

---

Slice folders of markdown into a relational content graph, give your coding agents a durable memory of decisions and reasoning, or bake out a massive editorial blog without paying for a database — Flatbread does all of this from files you already have in Git.

```bash
npm install flatbread
npx flatbread init
```

## What Flatbread does

Flatbread turns files into a typed relational graph. Markdown and YAML are the defaults, but you can wire in CSV, Google Sheets, Notion, Linear, or anything else you can parse — even blend them together. Define your collections, declare how they link, and query the whole thing from a single API.

You give it:

- **Files** — markdown, YAML, or any structured format via a source plugin
- **A config** — which folders are which collections, and how records reference each other (`refs`)
- **An optional transformer** — to parse frontmatter, convert markdown to HTML, etc.

You get back:

- A **typed content graph** with relations resolved across files
- **Generated TypeScript** types from your content model
- A **GraphQL server** (one read surface, not the whole product) for dev and build
- A **CLI** for codegen, querying, and the Effort Graph

## For building with agents: the Effort Graph

How many times have you been in the flow state of communication with your agents — they _perfectly_ execute on your vision, everything feels possible, you're at one with The Prompt — and then you kick off a fresh session for a followup that absolutely mangles that beautiful alignment after burning through a whopping post-subsidized $108.13 of tokens, punching slop holes in your walls, making you feel powerless to the thought you're not a real engineer anymore?

Well — Flatbread's bread and butter _(I won't stop with the bread puns)_ is putting an end to that feeling.

**Rather than shipping only the code, ship and review the chain of decisions that produced it.**

The [Effort Graph](./packages/effort-graph/) gives your agent structured, persistent memory scoped to the work it's doing. While performing work, it records:

- **Efforts** — the anchor for a thread of work (a feature, migration, spike)
- **Decisions** — commitments among alternatives, with the reasoning attached
- **Issues** — tracked questions, gaps, and blockers
- **Findings** — grounded observations that inform decisions or refute assumptions
- **Constraints, Risks, Citations, Blobs** — the supporting context

Every record is a markdown file in your repo. You commit, diff, review, and revert an agent's reasoning the same way you handle code. The memory outlives the session that produced it, so the next agent (or human) can recall _why_ something is the way it is without assuming it's malleable.

This is context-efficient, too. The Effort Graph tools give your agent an index of topics with keywords, then on query, it creates minimal temporary files for the agent to grep — a compact representation of the state of an Effort, or all open questions and issues — so the agent queries deeper only when it needs to.

```bash
# Install the skill and verify setup
npx skills add https://github.com/FlatbreadLabs/flatbread/tree/v1.0.0/packages/effort-graph/skills/effort-graph --skill effort-graph
npx flatbread effort bootstrap --verify
```

Read the full [Effort Graph README](./packages/effort-graph/README.md) for the domain model, install steps, and write operations.

## For products: relational content without a database

Once upon a time I didn't want to pay $8/mo to host a Postgres DB I was going to push to once a day, and then I became hyper-fixated on abusing Git as a database for my tea log. Now we're here!

Flatbread gives you a vendor-agnostic, typed API for your site's structured data. It handles the cases that don't need frequent updates reflected instantly — if you can wait a minute for CI to cook, you may just want to bake your site with Flatbread.

Your dev or build process wraps with Flatbread's server. Posts resolve their authors by ID. Tags live as frontmatter arrays or as their own collection. You get joins over files without a CMS database, and your content stays versioned and reviewable in Git.

```js
// flatbread.config.js
import { defineConfig, sourceFilesystem, transformerMarkdown } from 'flatbread';

export default defineConfig({
  source: sourceFilesystem(),
  transformer: transformerMarkdown({ markdown: { gfm: true } }),
  content: [
    { path: 'content/posts', collection: 'Post', refs: { authors: 'Author' } },
    { path: 'content/authors', collection: 'Author' },
  ],
});
```

```bash
# Wrap your dev server — Flatbread starts GraphQL on :5057
npx flatbread start --watch -- next dev --turbopack
```

```graphql
query Posts {
  allPosts(limit: 5) {
    title
    tags
    authors {
      id
      name
    }
  }
}
```

## Quick start

**Prerequisites:** Node 20.19+ and pnpm 10.33.x (or npm/yarn/bun for your own project).

### Try the bundled example

```bash
git clone https://github.com/FlatbreadLabs/flatbread.git
cd flatbread
pnpm install && pnpm build
cd examples/nextjs
pnpm exec flatbread start --watch -- next dev --turbopack
```

GraphQL playground: `http://localhost:5057/graphql`
Next.js app: `http://localhost:3000`

### Add Flatbread to your own project

```bash
npm install flatbread
npx flatbread init          # scaffolds flatbread.config.js
npx flatbread codegen       # generates TypeScript types from your content
npx flatbread start --watch -- <your dev command>
```

## How it works

```
┌─────────────┐     ┌──────────────┐     ┌───────────────┐     ┌─────────────┐
│  Your files │ ──▶ │ Source plugin │ ──▶ │  Transformer  │ ──▶ │ Content     │
│  (md/yaml)  │     │ (filesystem) │     │  (markdown)   │     │ Graph       │
└─────────────┘     └──────────────┘     └───────────────┘     └──────┬──────┘
                                                                       │
                                           ┌───────────────────────────┼───────┐
                                           │                           ▼       │
                                           │  ┌─────────┐  ┌──────────────┐   │
                                           │  │ Codegen │  │ GraphQL API  │   │
                                           │  │  (TS)   │  │  (:5057)     │   │
                                           │  └─────────┘  └──────────────┘   │
                                           └───────────────────────────────────┘
```

**Source plugins** read files from disk (or anywhere). **Transformers** parse them into records with typed fields. **Refs** in config declare how records link to each other. The graph is then readable through generated TypeScript, GraphQL, or the CLI.

## Packages

| Package                                                               | What it does                                                                |
| --------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| [`flatbread`](./packages/flatbread/)                                  | The main package — re-exports core, source-filesystem, transformer-markdown |
| [`@flatbread/core`](./packages/core/)                                 | Graph engine, schema generation, resolvers, filter/sort/pagination          |
| [`@flatbread/effort-graph`](./packages/effort-graph/)                 | Structured agent memory — Efforts, Decisions, Findings, Issues, and more    |
| [`@flatbread/codegen`](./packages/codegen/)                           | TypeScript generation from the content model                                |
| [`@flatbread/source-filesystem`](./packages/source-filesystem/)       | Reads files from disk                                                       |
| [`@flatbread/transformer-markdown`](./packages/transformer-markdown/) | Parses markdown + frontmatter                                               |
| [`@flatbread/transformer-yaml`](./packages/transformer-yaml/)         | Parses YAML files                                                           |
| [`@flatbread/explorer`](./packages/explorer/)                         | Visual content-relation explorer UI                                         |
| [`@flatbread/proof`](./packages/proof/)                               | DAG task runner for agentic workflows                                       |
| [`@flatbread/resolver-svimg`](./packages/resolver-svimg/)             | Image optimization field resolver                                           |
| [`@flatbread/config`](./packages/config/)                             | Config loading and validation                                               |
| [`@flatbread/utils`](./packages/utils/)                               | Shared utilities                                                            |

## What Flatbread does not do

- It is not a hosted CMS, dashboard, or writing UI.
- It is not a general-purpose database. Transactions, access control, and many concurrent writers are outside its scope.
- It does not reload its own packages at runtime. `flatbread start --watch` picks up content and config changes, but a change to a Flatbread package needs a rebuild and restart.

## Query arguments (GraphQL)

When GraphQL is your read interface, list queries accept these arguments (applied in this order):

| Argument | What it does                    | Accepts                                                         |
| -------- | ------------------------------- | --------------------------------------------------------------- |
| `filter` | Narrows results by field values | Nested object with [MongoDB-style operators](#filter-operators) |
| `sortBy` | Sorts by a root-level field     | Field name string                                               |
| `order`  | Sort direction                  | `ASC` or `DESC` (default `ASC`)                                 |
| `skip`   | Skips N entries                 | Integer                                                         |
| `limit`  | Caps returned entries           | Integer                                                         |

### Filter operators

Filters use a subset of MongoDB query syntax. Nest to the field path, then apply an operator:

```graphql
allPosts(filter: { postMeta: { rating: { gt: 80 } } }) {
  title
}
```

**Comparison:** `eq`, `ne`, `lt`, `lte`, `gt`, `gte`
**Set membership:** `in`, `nin`, `includes`, `excludes`
**Existence:** `exists`, `strictlyExists`
**Pattern:** `regex`, `wildcard` (case-insensitive, uses [matcher](https://github.com/sindresorhus/matcher))

Combine filters by adding sibling paths in the filter object — they intersect:

```graphql
allPosts(
  filter: { title: { wildcard: "*tion" }, postMeta: { rating: { gt: 80 } } }
) {
  title
}
```

## Field overrides

Override how a field resolves or what GraphQL type it exposes:

```js
content: [
  {
    path: 'content/posts',
    collection: 'Post',
    overrides: [
      { field: 'name', type: 'String', resolve: (name) => capitalize(name) },
    ],
  },
];
```

Supported field path syntax: `nested.object`, `an.array[]`, `an.array[]with.object`.

## Docs

- [Glossary](./docs/glossary.md) — collections, relations, IDs, validation, generated types
- [Local development loop](./docs/local-dev-loop.md) — what auto-reloads and what needs a restart
- [Data ownership](./docs/data-ownership.md) — keeping and exporting your data
- [JSON export](./docs/json-export.md) — stable snapshots from the core API
- [Positioning](./docs/positioning.md) — where Flatbread fits relative to CMSs and databases

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the development setup, build commands, and release process.
