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

Slice a pile of markdown into a typed relational graph. Journal the decisions
your agents make into an Effort Graph, so your team can review the thinking and
not just the diff. Bake out a massive editorial blog without paying anybody for
a database. Flatbread does all three, from files already sitting in your Git
repo.

Flatbread orchestrates relational collections of data over whichever storage you
prefer, and hands your app one cohesive API to read it. Out of the box it reads
folders of markdown or YAML — flat files. It is not stuck there. A **source**
plugin says where the bytes come from and a **transformer** plugin says how to
parse them, so a collection can come from CSV, Google Sheets, Notion, Figma,
Linear, or anywhere else you can define and retrieve structured data. Blend them
all into one graph if you like. You write the plugin, then declare your
collections and the links between them in `flatbread.config.js`. Today the box
ships the filesystem, markdown, and YAML; everything past that is a plugin
somebody has to write, and that somebody could be you.

```bash
pnpm add flatbread
pnpm exec flatbread init     # scaffolds flatbread.config.js
```

Needs Node 20.19 or newer. Every read below runs against files you can open in
an editor, so nothing here hides in a service you cannot reach.

---

## For building with agents: the Effort Graph

How many times have you hit that flow state with an agent? Context aligned,
vision landed, everything possible, you and The Prompt as one. Then you open a
fresh session for a small follow-up, and it mangles that beautiful alignment
after burning a whopping post-subsidy $108.13 of tokens, punching holes of slop
in the walls, and leaving you wondering whether you count as a real engineer
anymore.

Flatbread's ...bread and butter _(I'm not going to stop with the bread puns)_ is
putting an end to that feeling. Do not ship only the last thing the process
produced — the code. Ship the chain of decisions that got you there, and review
that too.

### What it remembers

The Effort Graph gives your agent durable memory for the things that normally
die with a session: **Decisions**, open questions and **Issues**,
**Constraints**, **Risks**, and the surprising **Findings** that refute
everything I just said. Every record belongs to exactly one **Effort** — one
thread of work — and every record is a markdown file in your repository. So an
agent reads _why_ something is the way it is instead of assuming it is soft and
reshaping it. Because a record is scoped to its Effort and linked to what it
came from, a decision made for one job does not leak into the next one.

### It costs almost nothing to remember

A read never dumps records into the transcript. It returns a short summary, page
counts, up to ten suggested follow-up queries, and a path to a rendered markdown
digest — one file the agent Reads once or greps. Digests cap at 25 records, one
relation hop, 50 edges, and 64 KiB, and browse reads excerpt each body to 600
characters. Asking "what is blocking this Effort?" therefore costs one small
file, and going deeper is a deliberate second call.

### The loop, start to finish

Add the content model to your config and check the setup:

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

```bash
$ flatbread effort bootstrap
{"status":"ready","config_path":"flatbread.config.js","graph_root":".flatbread-efforts","requirements":[]}
```

Open an Effort. Every write prints the id it created, which is how the next
write links to it:

```bash
$ flatbread effort write '{"type":"CreateEffort","title":"Recipe search without a database","body":"Add search over the recipe collection using the files we already have."}'
{"generation":"1","artifacts":[{"id":"eff-recipe-search-without-a-database--bpbj5mecw93526df","path":"efforts/eff-recipe-search-without-a-database--bpbj5mecw93526df.md","operation":"created"}], …}
```

Record what is in the way, then the call that answers it. `derives_from` is the
link that says this Decision exists because of that Issue:

```bash
$ flatbread effort write '{"type":"WriteIssue","effort":"eff-recipe-search-…","kind":"blocker","title":"Ranking rule for ingredient matches is undecided","body":"Title-only search misses ingredient queries."}'
$ flatbread effort write '{"type":"WriteDecision","effort":"eff-recipe-search-…","title":"Weight ingredient hits above title hits","body":"Score an ingredient field hit at twice a title hit. Reverse this if editors report that flagship recipes drop off the first page.","derives_from":["iss-ranking-rule-…"]}'
```

Two sessions later, a different agent asks what is gating the work and gets back
an envelope, not a wall of text:

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

The digest at `artifact_path` is the evidence — the proposed Decision, its
`derives_from` edge, and the open blocker Issue it answers:

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

And the record itself is a file you can read, review in a pull request, and
revert:

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

### Teach an agent to use it

The packaged skill covers all fifteen writes and five reads, so you do not have
to explain them:

```bash
npx skills add https://github.com/FlatbreadLabs/flatbread/tree/v1.0.0/packages/effort-graph/skills/effort-graph --skill effort-graph
npm install --save-dev flatbread@1.0.0
```

The full record model, every mutation, and the read caps live in the
[Effort Graph README](https://github.com/FlatbreadLabs/flatbread/blob/main/packages/effort-graph/README.md).
To look at a graph instead of reading it, `flatbread start --open` serves the
[explorer](https://github.com/FlatbreadLabs/flatbread/tree/main/packages/explorer),
which draws the records and their edges.

---

## For products: query relational data

Once upon a time I did not want to pay $8/mo to host a Postgres database I was
going to push to once a day, so I became hyper-fixated on abusing Git as a
database for my tea log. Now we're here.

Flatbread gives you a vendor-agnostic API for your site's structured data. It
suits any case that does not need an edit to appear a half-second later. If you
can wait a minute for CI to cook, you may just want to bake your site with
Flatbread. Wrap your dev or build command and populate pages on anything — a
blog, a recipe site, a marketing page, a merch store.

### Quickstart: posts, authors, and tags

Files are the records, and `refs` are the joins. A post names its authors by id
in frontmatter:

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

Config says which folder is which collection and which frontmatter field points
at another collection:

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

Then `authors` resolves to whole `Author` records, while `tags` stays a plain
string list on `Post`:

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

That is the whole trick, in three layers:

| Layer                     | What you write                                         | What you get                                                         |
| ------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------- |
| **Files**                 | `authors:` ids in a post match `id:` in author files   | One record per file, with frontmatter as fields                      |
| **`flatbread.config.js`** | `collection: 'Post'` and `refs: { authors: 'Author' }` | Typed collections, and validation that every ref points at something |
| **Read**                  | A `.graphql` document or the generated TypeScript API  | `authors` as `Author` objects; `tags` as `[String]`                  |

`tags` above is facet metadata repeated on each post, not a link. If you want
tag **records** shared across posts, model a `Tag` collection and wire `refs`
yourself. The
[glossary](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/glossary.md#tag-facet-vs-tag-collection)
spells out the difference.

### Wire it into your framework

`flatbread start` runs the GraphQL server and passes everything after `--`
through to your own command. There is no `flatbread dev`.

```json
{
  "scripts": {
    "dev": "flatbread start --watch -- next dev --turbopack",
    "build": "flatbread start -- next build"
  }
}
```

GraphQL lands on `http://localhost:5057/graphql`. Open it for Apollo Studio
against your generated schema. With `--watch`, valid content and config edits
update the running server; a change to a Flatbread package still needs a
rebuild. The
[local development loop](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/local-dev-loop.md)
lists exactly what reloads and what does not.

### Get typed results

Save your operations in `.graphql` files, point `codegen.documents` at them in
config, and run:

```bash
pnpm exec flatbread codegen --verbose
```

That writes `generated/graphql.ts`: TypeScript types and typed document nodes,
so the result of `GetPostsAndAuthors` above is typed as
`GetPostsAndAuthorsQuery`.

#### Choosing a read interface

Files come first. They define records, frontmatter fields, ids, and `refs`, and
`flatbread.config.js` groups them into typed collections. You then have two ways
to read the same graph.

Use **GraphQL operations** when your app wants explicit query documents, custom
selections, Apollo or another GraphQL client, persisted operations, or the
endpoint directly. Add `.graphql` documents, include the fields you need, and
rerun codegen so the operation types match the graph.

Use the prototype **generated TypeScript read API** when you want
collection-shaped helpers instead of a GraphQL document at every call site.
`createFlatbreadReadApi()` reads posts, authors, and tags with a generated
default selection. It still runs through the GraphQL layer, and its
selection-string escape hatch is experimental, so GraphQL stays the stable
lower-level interface. See
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

From the repository root, `pnpm play` does the same thing, and
`pnpm play:efforts` opens the explorer on this repository's own Effort Graph.
More detail lives in the
[Next.js example README](https://github.com/FlatbreadLabs/flatbread/blob/main/examples/nextjs/README.md).
There is also a
[SvelteKit example](https://github.com/FlatbreadLabs/flatbread/tree/main/examples/sveltekit),
which exercises the svimg resolver, YAML collections, and nested overrides.

## What Flatbread does not do

- It is not a hosted CMS, a dashboard, or a writing UI.
- It is not a general-purpose GraphQL platform or a database. Transactions,
  detailed access control, and many concurrent writers are outside its scope.
- It does not reload its own packages. `flatbread start --watch` picks up valid
  content and config changes while you work, but editing a Flatbread package
  needs a rebuild and a restart.
- GraphQL is one read interface over the graph, not the product. Files and
  config come first; see
  [positioning](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/positioning.md).

**Who it is for:** people building coding agents that need memory a human can
review in Git, and teams building TypeScript sites, internal tools, and starters
that want versioned content with real links between entries.

**If you leave:** your files stay in Git, and the core API writes JSON and CSV
snapshots. See
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
