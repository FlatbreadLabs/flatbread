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

Flatbread is a **Git-native relational content layer for TypeScript apps**. Model collections and relationships over Markdown, YAML, and other flat files; query the model with GraphQL today; and keep the source data readable, reviewable, and portable in Git.

Flatbread is for teams that want structured, typed, file-backed content without adopting a hosted CMS or treating GraphQL as the product boundary. GraphQL is one interface over the relational content model, not the whole value proposition.

For contributing to this monorepo, use Node 20.19+ with pnpm 10.33.x. Runtime support for published packages is tracked by each package's own metadata.

## Product scope

Flatbread is intentionally centered on read-mostly content graphs in your repository:

- **Good fit:** docs sites, blogs, changelogs, product catalogs, agent artifact graphs, and other TypeScript apps where authors keep source content in Git.
- **Current interface:** generated GraphQL schema/server plus GraphQL Code Generator output for TypeScript consumers.
- **Planned direction:** generated TypeScript read APIs and agent-oriented query surfaces over the same model.
- **Non-goals:** Flatbread is not a replacement for a general-purpose database, a hosted CMS, or an editing dashboard. It does not try to provide transactions, auth, permissions, or high-scale writes.

Start with the [`posts/authors/categories quickstart`](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/quickstart-posts-authors-tags.md) and the [`relational primitives glossary`](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/relational-primitives.md) if you are new to Flatbread's vocabulary. Product tradeoffs are tracked in the [`PMF decision rubric`](https://github.com/FlatbreadLabs/flatbread/blob/main/docs/pmf-decision-rubric.md).

# Canonical quickstart: posts, authors, and tags

🚧 This project is currently experimental, and the API may change considerably before `v1.0`.

The recommended first path is the Next.js example because it exercises the current root package, GraphQL server, and generated TypeScript types together.

```bash
pnpm install
pnpm build
cd examples/nextjs
npx flatbread codegen --verbose
npx flatbread start -- next dev --turbopack
```

Then open `http://localhost:3000`. Flatbread serves GraphQL on `http://localhost:5057/graphql` while Next.js renders typed query results in the app.

The example models content as related collections:

```text
examples/nextjs/content/
├─ markdown/authors/
├─ markdown/posts/
└─ yaml/authors/
```

Those files are loaded by `examples/nextjs/flatbread.config.js`:

```js
import { defineConfig, transformerMarkdown, sourceFilesystem } from 'flatbread';

export default defineConfig({
  source: sourceFilesystem(),
  transformer: transformerMarkdown({ markdown: { gfm: true } }),
  content: [
    {
      path: 'content/markdown/posts',
      collection: 'Post',
      refs: { authors: 'Author' },
    },
    {
      path: 'content/markdown/posts/[category]/[slug].md',
      collection: 'PostCategory',
      refs: { authors: 'Author' },
    },
    {
      path: 'content/markdown/authors',
      collection: 'Author',
    },
  ],
});
```

From that model, Flatbread generates:

1. collections and relations from the backing files,
2. a GraphQL schema as the current query interface,
3. TypeScript query/result types through `npx flatbread codegen`, and
4. app-visible query results in the Next.js example.

> NOTE: detecting changes to your content while Flatbread is running is [not yet supported](https://github.com/FlatbreadLabs/flatbread/issues/65). Restart the Flatbread process after content or schema changes until the unified watch loop lands.

## Query arguments

The following arguments are listed in their order of operation.

### `filter`

Each collection in the GraphQL schema can be passed a `filter` argument to constrain your results, sifting for only what you want. Any leaf field should be able to be used in a filter.

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
  - if you wanna take a shot at that, start a PR for [adding arg typeOf checks and subsequent unique comparator functions 🥪](https://github.com/FlatbreadLabs/flatbread/blob/main/packages/core/src/utils/sift.ts)

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

Sorts by the given field. Accepts a root-level field name. Defaults to not sortin' at all.

### `order`

The direction of sorting. Accepts `ASC` or `DESC`. Defaults to `ASC`.

### `skip`

Skips the specified number of entries. Accepts an integer.

### `limit`

Limits the number of returned entries to the specified amount. Accepts an integer.

## Query within your app ❓❓

[Check out the example integrations](https://github.com/FlatbreadLabs/flatbread/tree/main/examples) of using Flatbread with frameworks like SvelteKit and Next.js.

## Field overrides

Field overrides allow you to define custom GraphQL types or resolvers on top of fields in your content. For example, you could [optimize images](https://github.com/FlatbreadLabs/flatbread/tree/main/packages/resolver-svimg/), encapsulate an endpoint, and more!

### Example

```js
{
  content: {
    ...
    overrides: [
      {
        // using the field name
        field: 'name'
        // the resulting type is string
        // this can be a custom gql type
        type: 'String',
        // capitalize the name
        resolve: name => capitalize(name)
      },
    ]
  }
}
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

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the release workflow (bumping versions and publishing).
