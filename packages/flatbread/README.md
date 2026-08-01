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
cohesive API. Its default data source is folders of markdown or yaml files,
"flat files". Yet it supports far more than that - you could weave together
collections across csv files, Google Sheets, Notion, Figma, Linear, or anywhere
else you can define and retrieve structured data - even blend them all together!
You just need to provide an adaptor for parsing your data and define a config
file of relational fields and collection metadata.

Today Flatbread ships adaptors for the filesystem, markdown, and YAML, so
anything beyond those three is an adaptor you write.

```bash
pnpm add flatbread
pnpm exec flatbread init
```

The `init` command generates a starter `flatbread.config.js` for you to fill in,
and every published package requires Node 20.19 or newer.

---

## For building with agents: the Effort Graph

How many times have you felt in the flow state of communication, aligning on
context with your agents, they _perfectly_ execute on your vision? Everything
feels possible; you're at one with The Prompt. But then you kick off a fresh
session for a followup that just absolutely mangles that beautiful alignment
after burning through a whopping post-subsidized $108.13 of tokens, punching
holes of slop in the walls, making you feel powerless to the thought you're not
a real engineer anymore? WELL, Flatbread's ...bread and butter _(I'm not going
to stop with the bread puns)_ is putting an end to that feeling. Rather than
just shipping the very end of the process as the artifact (the code), ship _and
review_ the chain of decisions that got you there. The Effort Graph is your
salvation!

Alright, so Flatbread's Effort Graph gives your agent advanced memory for key
decisions, open questions, issues, plans, surprising findings which refute all
of the stuff I just mentioned, and more - all scoped to Efforts. While
performing work, an agent will recall memories to understand _why_ something is
the way it is without just assuming it's malleable. Since the memory entry is
well-scoped and relational, this prevents over-indexing on a decision outside of
its intended application. And this is context-efficient, too. The Effort Graph's
tools give your agent an index of the records in an Effort plus a few follow-up
queries to run, then on query, it writes cached markdown digests for your agent
to grep. These contain a minimal representation of the state of an Effort, or
maybe all open questions and issues, allowing an agent to query deeper only when
it needs to.

### Try it

The Effort Graph arrives as a content preset, so activating it costs you one
import and one entry in your configuration:

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

Then confirm the activation with bootstrap, which reports whatever remains
missing without ever editing your files:

```bash
$ flatbread effort bootstrap
{"status":"ready","config_path":"flatbread.config.js","graph_root":".flatbread-efforts","requirements":[]}
```

Open an Effort before anything else, because every write prints the identifier
it created and later writes reference that identifier to connect records to one
another:

```bash
$ flatbread effort write '{"type":"CreateEffort","title":"Recipe search without a database","body":"Add search over the recipe collection using the files we already have."}'
{"generation":"1","artifacts":[{"id":"eff-recipe-search-without-a-database--bpbj5mecw93526df","path":"efforts/eff-recipe-search-without-a-database--bpbj5mecw93526df.md","operation":"created"}], …}
```

Record the blocker you encountered and then the decision that resolves it, where
`derives_from` establishes the connection running from that decision back to the
original issue:

```bash
$ flatbread effort write '{"type":"WriteIssue","effort":"eff-recipe-search-…","kind":"blocker","title":"Ranking rule for ingredient matches is undecided","body":"Title-only search misses ingredient queries."}'
$ flatbread effort write '{"type":"WriteDecision","effort":"eff-recipe-search-…","title":"Weight ingredient hits above title hits","body":"Score an ingredient field hit at twice a title hit. Reverse this if editors report that flagship recipes drop off the first page.","derives_from":["iss-ranking-rule-…"]}'
```

Two sessions later, another agent asking what holds up the work receives a
compact JSON envelope containing a summary, pagination details, executable
follow-up queries, and a path to a rendered markdown digest:

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

That digest contains the proposed decision, the `derives_from` relationship it
declares, and the open blocker sitting behind it:

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

The issue itself remains an ordinary file in your repository, which means you
read it, review it inside a pull request, and revert it exactly like everything
else you commit:

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

Every read obeys the same fixed limits of 25 records per digest, a single
relation hop, 50 edges, and 64 KiB, and browsing reads shorten each body to 600
characters, which is why asking what blocks an Effort costs your agent nothing
more than one small file. Whenever an agent needs a complete body, `flatbread effort get <id>` returns that single record in full.

### Teach your agent the commands

The packaged skill documents all fifteen writes and five reads, which spares you
from explaining them:

```bash
npx skills add https://github.com/FlatbreadLabs/flatbread/tree/v1.0.0/packages/effort-graph/skills/effort-graph --skill effort-graph
npm install --save-dev flatbread@1.0.0
```

The record types, every mutation, and the read limits are documented in the
[Effort Graph
README](https://github.com/FlatbreadLabs/flatbread/blob/main/packages/effort-graph/README.md).
For anyone who would rather look at a graph than read one, `flatbread start --open` serves the
[explorer](https://github.com/FlatbreadLabs/flatbread/tree/main/packages/explorer),
which draws the records alongside the relationships connecting them.

---

## For products: query relational data

Once upon a time I didn't want to pay $8/mo to host a Postgres DB I was going to
push to once a day, and then I became hyper-fixated on abusing git as a database
for my tea log. Now we're here!

Flatbread gives you an excellent vendor-agnostic API for your site's structured
data. It's a robust solution to cases that don't need frequent updates to be
immediately reflected. If you can wait a minute for CI to cook, you may just
want to bake your site with Flatbread!

Your dev or build process can be wrapped by Flatbread's GraphQL server to
populate pages on anything - maybe a blog, recipe site, marketing page, or merch
store.

### Quickstart: posts, authors, and tags

A post declares its authors by identifier in frontmatter, alongside whatever
other metadata belongs to that post:

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

Your configuration then declares which folder becomes which collection, and
which frontmatter field references another collection:

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

With that established, `authors` resolves into complete `Author` records while
`tags` remains an ordinary list of strings attached to `Post`:

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

The same relational model carries through all three layers:

| Layer                     | What you write                                         | What you get                                                   |
| ------------------------- | ------------------------------------------------------ | -------------------------------------------------------------- |
| **Files**                 | `authors:` ids in a post match `id:` in author files   | One record per file, with frontmatter as fields                |
| **`flatbread.config.js`** | `collection: 'Post'` and `refs: { authors: 'Author' }` | Typed collections, and a check that every ref points somewhere |
| **Read**                  | A `.graphql` document or the generated TypeScript API  | `authors` as `Author` objects, `tags` as `[String]`            |

The `tags` field here is metadata repeated on every post rather than a
relationship, so anyone wanting tag **records** shared between posts models a
`Tag` collection and wires the `refs` themselves. The
[glossary](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/glossary.md#tag-facet-vs-tag-collection)
explains that distinction in more detail.

### Wire it into your framework

`flatbread start` runs the GraphQL server and then executes whatever command
follows `--`, and there is deliberately no `flatbread dev` subcommand:

```json
{
  "scripts": {
    "dev": "flatbread start --watch -- next dev --turbopack",
    "build": "flatbread start -- next build"
  }
}
```

GraphQL answers on `http://localhost:5057/graphql`, where opening that address
explores your generated schema through Apollo Studio. Passing `--watch` means
edits to content and configuration update the running server, although editing a
Flatbread package itself still requires a rebuild. The [local development
loop](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/local-dev-loop.md)
documents what reloads and what does not.

### Get typed results

Save your operations in `.graphql` files, point `codegen.documents` at them from
your configuration, and generate the types:

```bash
pnpm exec flatbread codegen --verbose
```

That generates `generated/graphql.ts` containing TypeScript types and typed
document nodes, which turns the query above into a result typed as
`GetPostsAndAuthorsQuery`.

#### Choosing a read interface

Files come first, because they hold the records, the frontmatter fields, the
identifiers, and the `refs`, while `flatbread.config.js` gathers them into typed
collections. From there, two different interfaces read the same underlying
graph.

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

The Next.js example is the maintained end-to-end path, and it reads shared
markdown from `examples/content` through a `content/` symlink:

```bash
pnpm install
pnpm build
cd examples/nextjs
pnpm exec flatbread codegen --verbose
pnpm dev                 # Flatbread on 5057, Next on 3000
```

From the repository root, `pnpm play` does the same thing, while `pnpm play:efforts` opens the explorer against this repository's own Effort Graph.
More detail lives in the [Next.js example
README](https://github.com/FlatbreadLabs/flatbread/blob/main/examples/nextjs/README.md),
and a [SvelteKit
example](https://github.com/FlatbreadLabs/flatbread/tree/main/examples/sveltekit)
also exercises the svimg resolver, YAML collections, and nested overrides.

## What Flatbread does not do

- It is not a hosted CMS, a dashboard, or a writing UI.
- It is not a general-purpose GraphQL platform or a database, which puts
  transactions, detailed access control, and many concurrent writers outside its
  scope.
- It does not reload its own packages, so although `flatbread start --watch`
  picks up valid content and configuration changes while you work, editing a
  Flatbread package requires a rebuild and a restart.
- GraphQL is one interface onto the graph rather than the product itself,
  because files and configuration always come first. See
  [positioning](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/positioning.md).

It suits people building coding agents that need memory a human can review in
Git, and teams building TypeScript sites, internal tools, and starters that want
versioned content with real links between entries.

If you ever move off Flatbread, your files stay in Git and the core API writes
JSON and CSV snapshots. See [data
ownership](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/data-ownership.md)
and [JSON
export](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/json-export.md).

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
