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

Slice collections of markdown files into a relational graph, roll out an Effort
Graph of decision-making and knowledge to align your team's agentic development,
or even bake out a massive editorial blog without paying for a database -
Flatbread enables all of this and more.

Flatbread is a flexible toolset for orchestrating relational collections of data
against whichever storage format you prefer and querying it from a single
cohesive API. Its default data source is folders of markdown or yaml files, "flat
files". Yet it supports far more than that - you could weave together collections
across csv files, Google Sheets, Notion, Figma, Linear, or anywhere else you can
define and retrieve structured data - even blend them all together! You just need
to provide an adaptor for parsing your data and define a config file of
relational fields and collection metadata.

Today Flatbread ships adaptors for the filesystem, markdown, and YAML. Anything
else is an adaptor you write.

```bash
pnpm add flatbread
pnpm exec flatbread init
```

`init` writes a starter `flatbread.config.js`. Flatbread needs Node 20.19 or
newer.

---

## For building with agents: the Effort Graph

How many times have you felt in the flow state of communication, aligning on
context with your agents, they _perfectly_ execute on your vision? Everything
feels possible; you're at one with The Prompt. But then you kick off a fresh
session for a followup that just absolutely mangles that beautiful alignment
after burning through a whopping post-subsidized $108.13 of tokens, punching
holes of slop in the walls, making you feel powerless to the thought you're not a
real engineer anymore? WELL, Flatbread's ...bread and butter _(I'm not going to
stop with the bread puns)_ is putting an end to that feeling. Rather than just
shipping the very end of the process as the artifact (the code), ship _and
review_ the chain of decisions that got you there. The Effort Graph is your
salvation!

Alright, so Flatbread's Effort Graph gives your agent advanced memory for key
decisions, open questions, issues, plans, surprising findings which refute all of
the stuff I just mentioned, and more - all scoped to Efforts. While performing
work, an agent will recall memories to understand _why_ something is the way it
is without just assuming it's malleable. Since the memory entry is well-scoped
and relational, this prevents over-indexing on a decision outside of its intended
application. And this is context-efficient, too. The Effort Graph's tools give
your agent an index of the records in an Effort plus a few follow-up queries to
run, then on query, it writes cached markdown digests for your agent to grep.
These contain a minimal representation of the state of an Effort, or maybe all
open questions and issues, allowing an agent to query deeper only when it needs
to.

### Try it

Add the Effort Graph to your config:

```js
// flatbread.config.js
import {
  defineConfig,
  sourceFilesystem,
  transformerMarkdown,
  effortGraphContent,
} from 'flatbread';

export default defineConfig({
  source: sourceFilesystem(),
  transformer: transformerMarkdown(),
  content: [...effortGraphContent()],
});
```

Then check the setup. Bootstrap tells you what is still missing and never edits
your files:

```bash
$ flatbread effort bootstrap
{"status":"ready","config_path":"flatbread.config.js","graph_root":".flatbread-efforts","requirements":[]}
```

Open an Effort. Each write prints the id it created, and later writes use that
id:

```bash
$ flatbread effort write '{"type":"CreateEffort","title":"Recipe search without a database","body":"Add search over the recipe collection using the files we already have."}'
{"generation":"1","artifacts":[{"id":"eff-recipe-search-without-a-database--bpbj5mecw93526df","path":"efforts/eff-recipe-search-without-a-database--bpbj5mecw93526df.md","operation":"created"}], …}
```

Write the blocker you hit, then the decision that answers it. `derives_from`
links the decision back to the issue:

```bash
$ flatbread effort write '{"type":"WriteIssue","effort":"eff-recipe-search-…","kind":"blocker","title":"Ranking rule for ingredient matches is undecided","body":"Title-only search misses ingredient queries."}'
$ flatbread effort write '{"type":"WriteDecision","effort":"eff-recipe-search-…","title":"Weight ingredient hits above title hits","body":"Score an ingredient field hit at twice a title hit. Reverse this if editors report that flagship recipes drop off the first page.","derives_from":["iss-ranking-rule-…"]}'
```

Two sessions later, another agent asks what is holding up the work. It gets back
a small JSON envelope with a path to a markdown digest:

```bash
$ flatbread effort blocking-decisions eff-recipe-search-without-a-database--bpbj5mecw93526df
{
  "summary": "1 record; proposed 1; complete",
  "artifact_path": ".flatbread/effort-graph/read-cache/3/c98912e9….md",
  "served_generation": "3",
  "page": { "returned": 1, "has_more": false, "next_cursor": null },
  "hints": [
    "getRecord(\"dec-weight-ingredient-hits-above-title-hits--9bxx105d45e80s2b\")",
    "effortRecords(\"eff-recipe-search-…\", { kinds: [\"issue\"], where: { kind: [\"blocker\"], status: [\"open\"] } })"
  ]
}
```

That digest holds the proposed decision, its `derives_from` link, and the open
blocker behind it:

````text
## Records
### dec-weight-ingredient-hits-above-title-hits--9bxx105d45e80s2b
```yaml
created_at: "2026-08-01T03:36:34.398Z"
effort: "eff-recipe-search-without-a-database--bpbj5mecw93526df"
state: "proposed"
title: "Weight ingredient hits above title hits"
```

Score an ingredient field hit at twice a title hit. Reverse this if editors report that flagship recipes drop off the first page.

Relations
- derives_from: ["iss-ranking-rule-for-ingredient-matches-is-undecided--jbxh0rzhmfak4kqa"]
````

The issue itself is a file in your repo. You can read it, review it in a pull
request, and revert it:

```markdown
---
id: iss-ranking-rule-for-ingredient-matches-is-undecided--jbxh0rzhmfak4kqa
effort: eff-recipe-search-without-a-database--bpbj5mecw93526df
title: Ranking rule for ingredient matches is undecided
kind: blocker
status: open
created_at: '2026-08-01T03:36:26.636Z'
---

Title-only search misses ingredient queries. We must agree on a ranking rule
before building the index.
```

The limits on a read are fixed: 25 records per digest, one relation hop, 50
edges, and 64 KiB. Browse reads cut each body down to 600 characters, so asking
"what is blocking this Effort?" costs one small file. When an agent wants a whole
body, `flatbread effort get <id>` returns that one record in full.

### Teach your agent the commands

The packaged skill covers all fifteen writes and five reads, so you don't have to
explain them:

```bash
npx skills add https://github.com/FlatbreadLabs/flatbread/tree/v1.0.0/packages/effort-graph/skills/effort-graph --skill effort-graph
npm install --save-dev flatbread@1.0.0
```

The record types, every mutation, and the read limits are documented in the
[Effort Graph README](https://github.com/FlatbreadLabs/flatbread/blob/main/packages/effort-graph/README.md).
To look at a graph instead of reading it, `flatbread start --open` serves the
[explorer](https://github.com/FlatbreadLabs/flatbread/tree/main/packages/explorer),
which draws the records and the links between them.

---

## For products: query relational data

Once upon a time I didn't want to pay $8/mo to host a Postgres DB I was going to
push to once a day, and then I became hyper-fixated on abusing git as a database
for my tea log. Now we're here!

Flatbread gives you an excellent vendor-agnostic API for your site's structured
data. It's a robust solution to cases that don't need frequent updates to be
immediately reflected. If you can wait a minute for CI to cook, you may just want
to bake your site with Flatbread!

Your dev or build process can be wrapped by Flatbread's GraphQL server to
populate pages on anything - maybe a blog, recipe site, marketing page, or merch
store.

### Quickstart: posts, authors, and tags

A post lists its authors by id in frontmatter:

```markdown
---
id: sdfsdf-23423-sdfsd-23444-dfghf
title: 'The Art of Measuring Cats in Fruit Units'
authors:
  - 2a3e
  - 40s3
tags:
  - cats
  - measurements
  - fruit-science
  - important-research
---

Everything below the closing `---` is the post body.
```

Config says which folder holds which collection, and which frontmatter field
points at another collection:

```js
import { defineConfig, transformerMarkdown, sourceFilesystem } from 'flatbread';

export default defineConfig({
  source: sourceFilesystem(),
  transformer: transformerMarkdown({
    markdown: { gfm: true, externalLinks: true },
  }),
  content: [
    {
      path: 'content/markdown/posts',
      collection: 'Post',
      refs: { authors: 'Author' },
    },
    {
      path: 'content/markdown/authors',
      collection: 'Author',
      refs: { friend: 'Author' },
    },
  ],
});
```

Now `authors` comes back as whole `Author` records, and `tags` stays a list of
strings on `Post`:

```graphql
query GetPostsAndAuthors {
  allPosts(filter: { title: { wildcard: "*Cats*" } }) {
    id
    title
    tags
    authors {
      id
      name
    }
  }
}
```

```json
{
  "allPosts": [
    {
      "id": "sdfsdf-23423-sdfsd-23444-dfghf",
      "title": "The Art of Measuring Cats in Fruit Units",
      "tags": ["cats", "measurements", "fruit-science", "important-research"],
      "authors": [
        { "id": "40s3", "name": "Eva" },
        { "id": "2a3e", "name": "Tony" }
      ]
    }
  ]
}
```

Three layers, one model:

| Layer                     | What you write                                         | What you get                                                   |
| ------------------------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| **Files**                 | `authors:` ids in a post match `id:` in author files   | One record per file, with frontmatter as fields                |
| **`flatbread.config.js`** | `collection: 'Post'` and `refs: { authors: 'Author' }` | Typed collections, and a check that every ref points somewhere |
| **Read**                  | A `.graphql` document or the generated TypeScript API  | `authors` as `Author` objects, `tags` as `[String]`            |

`tags` here is metadata repeated on each post, not a link. For tag **records**
shared across posts, add a `Tag` collection and wire `refs` yourself. The
[glossary](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/glossary.md#tag-facet-vs-tag-collection)
explains the difference.

### Wire it into your framework

`flatbread start` runs the GraphQL server, then runs your own command after `--`.
There is no `flatbread dev`.

```json
{
  "scripts": {
    "dev": "flatbread start --watch -- next dev --turbopack",
    "build": "flatbread start -- next build"
  }
}
```

GraphQL runs on `http://localhost:5057/graphql`. Open that URL to explore your
generated schema in Apollo Studio. With `--watch`, edits to content and config
update the running server. Editing a Flatbread package still needs a rebuild. The
[local development loop](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/local-dev-loop.md)
lists what reloads and what doesn't.

### Get typed results

Save your queries in `.graphql` files, point `codegen.documents` at them in
config, and run:

```bash
pnpm exec flatbread codegen --verbose
```

That writes `generated/graphql.ts` with TypeScript types and typed document
nodes. The query above becomes `GetPostsAndAuthorsQuery`.

#### Choosing a read interface

Files come first. They hold the records, the frontmatter fields, the ids, and the
`refs`, and `flatbread.config.js` groups them into typed collections. From there
you have two ways to read the same graph.

Use **GraphQL operations** when your app wants its own query documents, custom
selections, Apollo or another GraphQL client, persisted operations, or the
endpoint directly. Add `.graphql` documents, include the fields you need, and
rerun codegen so the operation types match your data.

Use the prototype **generated TypeScript read API** when you'd rather call a
helper than write a GraphQL document at every call site.
`createFlatbreadReadApi()` reads posts, authors, and tags with a default
selection. It runs through the same GraphQL layer, and its selection-string
escape hatch is experimental, so GraphQL is still the stable lower-level
interface. See
[`examples/nextjs/lib/read.ts`](https://github.com/FlatbreadLabs/flatbread/blob/main/examples/nextjs/lib/read.ts).

---

## Run the bundled example

The Next.js example is the maintained end-to-end path. It reads shared markdown
from `examples/content` through a `content/` symlink.

```bash
pnpm install
pnpm build
cd examples/nextjs
pnpm exec flatbread codegen --verbose
pnpm dev                 # Flatbread on 5057, Next on 3000
```

From the repository root, `pnpm play` does the same thing, and `pnpm play:efforts`
opens the explorer on this repository's own Effort Graph. There is more detail in
the
[Next.js example README](https://github.com/FlatbreadLabs/flatbread/blob/main/examples/nextjs/README.md).
A
[SvelteKit example](https://github.com/FlatbreadLabs/flatbread/tree/main/examples/sveltekit)
also exercises the svimg resolver, YAML collections, and nested overrides.

## What Flatbread does not do

- It is not a hosted CMS, a dashboard, or a writing UI.
- It is not a general-purpose GraphQL platform or a database. Transactions,
  detailed access control, and many concurrent writers are out of scope.
- It does not reload its own packages. `flatbread start --watch` picks up valid
  content and config changes while you work, but editing a Flatbread package
  needs a rebuild and a restart.
- GraphQL is one way to read the graph, not the product itself. Files and config
  come first. See
  [positioning](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/positioning.md).

It suits people building coding agents that need memory a human can review in
Git, and teams building TypeScript sites, internal tools, and starters that want
versioned content with real links between entries.

If you ever move off Flatbread, your files stay in Git and the core API writes
JSON and CSV snapshots. See
[data ownership](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/data-ownership.md)
and
[JSON export](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/json-export.md).

## Reference

| Topic                                        | Where                                                                                                 |
| -------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `filter`, `sortBy`, `order`, `skip`, `limit` | [query arguments](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/query-arguments.md)       |
| Custom types and resolvers on a field        | [field overrides](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/field-overrides.md)       |
| Collections, records, refs, IDs, cardinality | [glossary](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/glossary.md)                     |
| Agent memory: records, writes, reads         | [Effort Graph](https://github.com/FlatbreadLabs/flatbread/blob/main/packages/effort-graph/README.md)  |
| What reloads in watch mode                   | [local development loop](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/local-dev-loop.md) |
| JSON and CSV snapshots                       | [JSON export](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/json-export.md)               |
| Keeping and moving your data                 | [data ownership](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/data-ownership.md)         |
| Compared with databases, CMSs, note tools    | [decision rubric](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/pmf-decision-rubric.md)   |
| Plugins and resolver helpers                 | [`packages/`](https://github.com/FlatbreadLabs/flatbread/tree/main/packages)                          |

To work on this monorepo rather than install from npm, use Node 20.19+ with pnpm
10.33.x.

# ☀️ Contributing

See
[CONTRIBUTING.md](https://github.com/FlatbreadLabs/flatbread/blob/main/CONTRIBUTING.md)
for the onboarding path and release steps, including version bumps and
publishing.
