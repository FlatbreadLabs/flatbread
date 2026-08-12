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

Flatbread turns files in Git into a typed relational graph. Files are the
records. `refs` in `flatbread.config.js` link them. You read the graph through
**[GraphQL](https://graphql.org/)**, generated TypeScript, or the `flatbread`
CLI.

People use it two ways.

**Durable memory for coding agents.** The
[Proof](https://github.com/FlatbreadLabs/flatbread/tree/main/packages/proof)
stores an agent's reasoning as markdown records in the repository: Efforts,
Issues, Findings, Decisions, Constraints, Risks, Citations, and Blobs. An agent
writes them with `flatbread proof write` and reads them back through bounded
queries such as `flatbread proof list` and
`flatbread proof blocking-decisions`. Records live under
`.flatbread-proof/`, so you commit, review, diff, and revert them like any
other file, and the memory outlives the session that produced it. The bundled
[Proof skill](https://github.com/FlatbreadLabs/flatbread/blob/main/packages/proof/skills/proof/SKILL.md)
teaches an agent the commands.

**Relational content for sites, docs, and internal tools.** Markdown and YAML
files become typed collections that link to each other. A post names its
authors by id, and Flatbread resolves them. You get versioned, reviewable
content and joins over files without a CMS database. Start with the
[Quickstart](#quickstart-posts-authors-and-tags).

Both paths run on the same engine. Plugins control how Flatbread reads files
and turns them into data.

**Who it is for:** People building coding agents that need memory they can
review in Git, and teams building TypeScript sites, internal tools, and starter
projects that want versioned content with links between entries.

**What Flatbread does not do:**

- It is not a hosted CMS, dashboard, or writing UI.
- It is not a general-purpose GraphQL platform or database. Transactions,
  detailed access control, and many concurrent writers are outside its scope.
- It does not reload its own packages. `flatbread start --watch` picks up valid
  content and config changes while you work, but a change to a Flatbread
  package needs a rebuild and a restart. See the
  [local development loop](https://github.com/FlatbreadLabs/flatbread/blob/main/apps/docs/content/docs/local-dev-loop.md).

**GraphQL:** GraphQL is one read interface over the graph. For more detail, see
[Flatbread positioning](https://github.com/FlatbreadLabs/flatbread/blob/main/apps/docs/content/docs/positioning.md).

**Glossary:** Definitions for collections, relations, IDs, validation, and the
generated GraphQL types are in the
[glossary](https://github.com/FlatbreadLabs/flatbread/blob/main/apps/docs/content/docs/glossary.md).

**Local development:** Learn what updates automatically and what needs a
restart in the
[local development loop](https://github.com/FlatbreadLabs/flatbread/blob/main/apps/docs/content/docs/local-dev-loop.md).

**Export:** The core API can create stable JSON snapshots. See
[JSON export](https://github.com/FlatbreadLabs/flatbread/blob/main/apps/docs/content/docs/json-export.md).

**Keeping your data:** Your files, Git history, JSON/CSV exports, GraphQL
introspection, and generated TypeScript remain available when you move away
from Flatbread. See
[data ownership](https://github.com/FlatbreadLabs/flatbread/blob/main/apps/docs/content/docs/data-ownership.md).

Every published package requires Node 20.19 or newer. To work on this monorepo,
use Node 20.19+ with pnpm 10.33.x.

## Quickstart (posts, authors, and tags)

Start with the **Next.js example** in `examples/nextjs`. It reads shared
Markdown from `examples/content` through its `content/` symlink. The commands
below use that layout.

### 1 · What you are modeling

- **Collections** (`Post`, `Author`) map to folders of files; see the [glossary](https://github.com/FlatbreadLabs/flatbread/blob/main/apps/docs/content/docs/glossary.md).
- **Relations:** posts declare `authors:` in frontmatter as a list of **author ids**; Flatbread resolves them through **`refs`** in config (same idea as joins, over files—**not** a remote database).
- **Tags:** in the bundled example, each post exposes **`tags`** as a **YAML string list** in frontmatter. That becomes a **`[String]`** field on **`Post`** in the generated schema. That is **facet-style metadata** repeated per post—not the same machinery as **`refs`** to another collection. If you need normalized tag **records** shared across posts, model a **`Tag`** collection and wire **`refs`** yourself (advanced).

Illustrative frontmatter:

```yaml
---
id: your-post-id
title: Example
authors:
  - author-id-one
tags:
  - typescript
  - content-graph
---
```

Markdown **below** the closing `---` is the post body.

### 2 · Content layout (this monorepo)

From the repo root, the markdown that backs the relational story lives here:

```text
examples/content/markdown/posts/     # Post collection (incl. example-post.md, …)
examples/content/markdown/authors/   # Author collection
```

The Next example points `flatbread.config.js` at `content/markdown/...` **relative to `examples/nextjs`**, where `content` is the symlink to `../content`.

**Backing files for posts, authors, and tags (this example):**

| What        | Where it lives                                                                                                                           | Glossary terms                                                                                                                                                                                                             |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Posts**   | `examples/content/markdown/posts/*.md` — one **record** per file                                                                         | [Collection](https://github.com/FlatbreadLabs/flatbread/blob/main/apps/docs/content/docs/glossary.md#collection), [Record](https://github.com/FlatbreadLabs/flatbread/blob/main/apps/docs/content/docs/glossary.md#record) |
| **Authors** | `examples/content/markdown/authors/*.md` — one **record** per file                                                                       | Same; **IDs** in frontmatter wire **relations**                                                                                                                                                                            |
| **Tags**    | The `tags:` YAML list **in each post’s frontmatter** (facet metadata on that **Post**). There is **no** `markdown/tags/` directory here. | [Tag (facet) vs `Tag` collection](https://github.com/FlatbreadLabs/flatbread/blob/main/apps/docs/content/docs/glossary.md#tag-facet-vs-tag-collection)                                                                     |

### Traceability: same relation model (files, config, query interface)

The table below follows one relation from files to config to the generated GraphQL schema. Files and config are the source of truth; GraphQL is one [query interface](https://github.com/FlatbreadLabs/flatbread/blob/main/apps/docs/content/docs/glossary.md#query-interface) over them.

| Layer                                     | You see…                                                                                                                         | Glossary                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Files**                                 | `authors:` ids in a post file match `id:` in author files; `tags:` is a string list on the post                                  | [Relation](https://github.com/FlatbreadLabs/flatbread/blob/main/apps/docs/content/docs/glossary.md#relation), [ID](https://github.com/FlatbreadLabs/flatbread/blob/main/apps/docs/content/docs/glossary.md#id), [Tag (facet) vs `Tag` collection](https://github.com/FlatbreadLabs/flatbread/blob/main/apps/docs/content/docs/glossary.md#tag-facet-vs-tag-collection) |
| **`flatbread.config.js`**                 | `content` entries with `collection: 'Post' \| 'Author'` and `refs: { authors: 'Author' }`                                        | [Collection](https://github.com/FlatbreadLabs/flatbread/blob/main/apps/docs/content/docs/glossary.md#collection), [Relation](https://github.com/FlatbreadLabs/flatbread/blob/main/apps/docs/content/docs/glossary.md#relation)                                                                                                                                         |
| **Generated GraphQL schema + codegen TS** | `allPosts { tags authors { id name } }` — **refs** resolve to **`Author`** objects; **`tags`** stays a scalar list on **`Post`** | [Generated schema and operation types (GraphQL)](https://github.com/FlatbreadLabs/flatbread/blob/main/apps/docs/content/docs/glossary.md#generated-schema-and-operation-types-graphql), [Cardinality](https://github.com/FlatbreadLabs/flatbread/blob/main/apps/docs/content/docs/glossary.md#cardinality)                                                             |

**Illustrative query result** (same **relation model** as [`examples/content/markdown/posts/example-post.md`](https://github.com/FlatbreadLabs/flatbread/blob/main/examples/content/markdown/posts/example-post.md): authors `2a3e` / `40s3`, **tags** from frontmatter). Values are from that file and its resolved **authors**; the shape matches the **`GetPostsAuthorsAndTags`** operation in **§3** after you include **`tags`** and **`authors`** in your **`.graphql`** document (see also `queries/posts.graphql`, which you can extend the same way):

```json
{
  "allPosts": [
    {
      "id": "sdfsdf-23423-sdfsd-23444-dfghf",
      "title": "The Art of Measuring Cats in Fruit Units",
      "tags": ["cats", "measurements", "fruit-science", "important-research"],
      "authors": [
        { "id": "2a3e", "name": "Tony" },
        { "id": "40s3", "name": "Eva" }
      ]
    }
  ]
}
```

Add **`tags`** (and any other fields) to your **`.graphql`** documents and rerun codegen so operations and `generated/graphql.ts` stay aligned with the files—snippets in docs are **illustrative** until your checked-in queries match.

### 3 · Run it from the repo root

Prerequisites: **Node 20.19+** and **pnpm 10.33.x**. See
[CONTRIBUTING.md](https://github.com/FlatbreadLabs/flatbread/blob/main/CONTRIBUTING.md).

```bash
pnpm install
pnpm build
cd examples/nextjs
pnpm exec flatbread codegen --verbose
```

That writes **`generated/graphql.ts`**: TypeScript types and typed document nodes for your **`.graphql`** operations (configure globs under `codegen.documents` in `flatbread.config.js`).

Add a `.graphql` file (see `queries/posts.graphql` in the example), then rerun **`pnpm exec flatbread codegen --verbose`** so the operation reflects **`tags`**, **`authors`**, etc. Illustrative operation you can paste into `queries/`:

```graphql
query GetPostsAuthorsAndTags {
  allPosts(limit: 5) {
    id
    title
    tags
    authors {
      id
      name
    }
  }
  allAuthors {
    id
    name
  }
}
```

After codegen, your app imports types from **`./generated/graphql`**. The result shape of that operation is typed, for example **`GetPostsAuthorsAndTagsQuery`**. Relations resolve to **`Author`** objects; **`tags`** stays a string array on **`Post`**, matching the file metadata. That is the same shape as the [illustrative JSON](#traceability-same-relation-model-files-config-query-interface) under **Traceability**.

The generated file also exposes a prototype **TypeScript read API** derived from the configured content model. In the Next.js example, [`examples/nextjs/lib/read.ts`](https://github.com/FlatbreadLabs/flatbread/blob/main/examples/nextjs/lib/read.ts) wires **`createFlatbreadReadApi()`** to the existing GraphQL fetcher. It reads **posts**, **authors**, and **tags** with a generated default selection, so there is no hand-written GraphQL document at the call site.

#### Choosing a read interface

Files come first. They define records, frontmatter fields, IDs, and `refs`;
`flatbread.config.js` tells Flatbread how to group them into typed collections.
**GraphQL** and the generated TypeScript API are two ways for your app to read
the same data.

Use **GraphQL operations** when your app needs explicit query documents, custom selections, Apollo or another GraphQL client, persisted operations, or direct access to the GraphQL endpoint. Add `.graphql` documents, include fields like **`tags`** and **`authors`**, and rerun codegen so operation types such as **`GetPostsAuthorsAndTagsQuery`** match the posts/authors/tags graph.

Use the prototype **generated TypeScript read API** when you want collection-shaped helpers instead of a GraphQL document at each call site. It suits plain reads: posts, authors, tags, and resolved relations. The helpers still run through the GraphQL layer, and their selection-string escape hatch is experimental. Both paths read the same typed graph from the same files; GraphQL is the stable lower-level interface.

Default filesystem + markdown wiring uses the bundled [`source-filesystem`](https://github.com/FlatbreadLabs/flatbread/tree/main/packages/source-filesystem) and [`transformer-markdown`](https://github.com/FlatbreadLabs/flatbread/tree/main/packages/transformer-markdown) plugins (`flatbread` re-exports them).

### 4 · Minimal relational config (mental model)

The example’s production config loads extra collections for tests; **the core onboarding shape** is:

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

### 5 · Reading the graph: GraphQL (after the model exists)

Flatbread builds a content graph from files. GraphQL is one read interface over that graph: a generated schema and the resolvers behind it.

Wire your framework so the CLI wraps dev/build (**`flatbread start`** passes through your command after **`--`**). There is **no** `flatbread dev` subcommand.

```js
// package.json scripts (adapt the part after `--` to your framework)
{
  "scripts": {
    "dev": "flatbread start --watch -- next dev --turbopack",
    "build": "flatbread start -- next build"
  }
}
```

In the Next.js example, **`pnpm dev`** starts Next and starts
Flatbread in watch mode. The GraphQL endpoint is
**`http://localhost:5057/graphql`** and the Next app is on **`3000`**.
**`pnpm start`** runs production Next without Flatbread.

```bash
pnpm dev
```

When the server starts, Flatbread prints the **`graphql`** URL. Open it to use
Apollo Studio with the generated schema. You can then save queries in
**`.graphql`** files and run **`flatbread codegen`** again.

With `--watch`, valid content and config changes update the running GraphQL
server. See the
[local development loop](https://github.com/FlatbreadLabs/flatbread/blob/main/apps/docs/content/docs/local-dev-loop.md)
for the cases that still need a rebuild or restart.

## Install Flatbread in your own repo

Outside this monorepo:

```bash
pnpm add flatbread
```

Scaffold **`flatbread.config.js`**:

```bash
pnpm exec flatbread init
```

Point **`content`** entries at **your** `posts/` and **`authors/`** folders, reuse the relational ideas above, and add **`codegen`** in config when you want **`generated/graphql.ts`**. Browse [`packages`](https://github.com/FlatbreadLabs/flatbread/tree/main/packages) for plugins and resolver helpers.

More detail on the bundled example is in the
[Next.js example README](https://github.com/FlatbreadLabs/flatbread/blob/main/examples/nextjs/README.md).

For agent memory instead of site content, add `proofContent()` to your
config, then run `flatbread proof bootstrap` to check the setup and
`flatbread proof bootstrap --verify` to fail when something is missing. The
[Proof README](https://github.com/FlatbreadLabs/flatbread/blob/main/packages/proof/README.md)
has the install commands.

## Query arguments (GraphQL read interface)

When **GraphQL** is your read interface, list fields use the following arguments in order of application.

### `filter`

Every collection in the GraphQL schema takes a `filter` argument that narrows the results. Any leaf field can be used in a filter.

The syntax for `filter` is based on a subset of [MongoDB's query syntax](https://docs.mongodb.com/manual/reference/operator/query/).

#### `filter` syntax

A filter is composed of a nested object with a shape that matches the path to the value you want to compare on every entry in the given collection. The deepest nested level that does not have a JSON object as its value will be used to build the comparison where the `key` is the comparison operation and `value` is the value to compare every entry against.

#### Example

```js
filter = { postMeta: { rating: { gt: 80 } } };

entries = [
  { id: 1, title: 'My pretzel collection', postMeta: { rating: 97 } },
  { id: 2, title: 'Debugging the simulation', postMeta: { rating: 20 } },
  {
    id: 3,
    title: 'Liquid Proust is a great tea vendor btw',
    postMeta: { rating: 99 },
  },
  { id: 4, title: 'Sitting in a chair', postMeta: { rating: 74 } },
];
```

The above filter would return entries with a rating greater than 80:

```js
result = [
  { id: 1, title: 'My pretzel collection', postMeta: { rating: 97 } },
  {
    id: 3,
    title: 'Liquid Proust is a great tea vendor btw',
    postMeta: { rating: 99 },
  },
];
```

#### Supported `filter` operations

- `eq` - equal
  - This is like `filterValue === resultValue` in JavaScript
- `ne` - not equal
  - This is like `filterValue !== resultValue` in JavaScript
- `in`
  - This is like `filterValue.includes(resultValue)` in JavaScript
  - Can only be passed an array of values which pass strict comparison
- `nin`
  - This is like `!filterValue.includes(resultValue)` in JavaScript
  - Can only be passed an array of values which pass strict comparison
- `includes`
  - This is like `resultValue.includes(filterValue)` in JavaScript
  - Can only be passed a single value which passes strict comparison
- `excludes`
  - This is like `!resultValue.includes(filterValue)` in JavaScript
  - Can only be passed a single value which passes strict comparison
- `lt`, `lte`, `gt`, `gte`
  - This is like `<`, `<=`, `>`, `>=` respectively
  - Can only be used with numbers, strings, and booleans
- `exists`
  - This is like `filterValue ? resultValue != undefined : resultValue == undefined`
  - Accepts `true` or `false` as a value to compare against (`filterValue`)
  - For checking against a property that could be both `null` or `undefined`
- `strictlyExists`
  - This is like `filterValue ? resultValue !== undefined : resultValue === undefined`
  - Accepts `true` or `false` as a value to compare against (`filterValue`)
  - Checking against a property for `undefined`
- `regex`
  - This is like new RegExp(filterValue).test(resultValue) in JavaScript
- `wildcard`
  - This is an abstraction on top of `regex` for loose string matching
  - Case insensitive
  - Uses [matcher](https://github.com/sindresorhus/matcher) and matcher's [API](https://github.com/sindresorhus/matcher#usage)

Caveats:

- Currently cannot infer date strings and then compare `Date` types in filters
  - should work if you dynamically pass in a `Date` object from your client, though not extensively tested
  - to fix this, add argument `typeof` checks and the matching comparator functions in [`packages/core/src/utils/sift.ts`](https://github.com/FlatbreadLabs/flatbread/blob/main/packages/core/src/utils/sift.ts), then open a pull request

#### Combining multiple filters

You can union multiple filters together by adding peer objects within your filter object to point to multiple paths.

#### Example

Using the `entries` from the previous example, let's combine multiple filters.

```graphql
query FilteredPosts {
  allPosts(
    filter: { title: { wildcard: "*tion" }, postMeta: { rating: { gt: 80 } } }
  ) {
    title
  }
}
```

Results in:

```js
result = [{ title: 'My pretzel collection' }];
```

### `sortBy`

Sorts by the given field. Accepts a root-level field name. Defaults to no sorting.

### `order`

The direction of sorting. Accepts `ASC` or `DESC`. Defaults to `ASC`.

### `skip`

Skips the specified number of entries. Accepts an integer.

### `limit`

Limits the number of returned entries to the specified amount. Accepts an integer.

## Query from your app

Follow [Quickstart (posts, authors, and tags)](#quickstart-posts-authors-and-tags)
to model related content, run codegen, and get typed results. For scripts and
framework setup, use the
[Next.js example](https://github.com/FlatbreadLabs/flatbread/tree/main/examples/nextjs).

## Field overrides

Field overrides allow you to define custom GraphQL types or resolvers on top of fields in your content. For example, you could [optimize images](https://github.com/FlatbreadLabs/flatbread/tree/main/packages/resolver-svimg/), encapsulate an endpoint, and more!

### Example

```js
const config = {
  content: {
    overrides: [
      {
        // The source field name.
        field: 'name',
        // The GraphQL type to expose.
        type: 'String',
        // Capitalize the value before returning it.
        resolve: (name) => capitalize(name),
      },
    ],
  },
};
```

### Supported syntax for field

- basic nested objects

  `nested.object`

- a basic array (will map array values)

  `an.array[]`

- a nested object inside an array (will also map array)

  `an.array[]with.object`

for more information in Overrides, they adhere to the GraphQLFieldConfig outlined here https://graphql-compose.github.io/docs/basics/what-is-resolver.html

## Advanced Config

### `fieldNameTransform`

Accepts a function which takes in field names and transforms them for the GraphQL schema generation -- this is used internally to remove spaces but can be used for other global transforms as well

```js
{
  ...
  // replace all spaces in field names with an underscore
  fieldNameTransform: (fieldName) => fieldName.replace(/\s/g, '_')
  ...
}
```

# ☀️ Contributing

See [CONTRIBUTING.md](https://github.com/FlatbreadLabs/flatbread/blob/main/CONTRIBUTING.md)
for release steps, including version bumps and publishing.
