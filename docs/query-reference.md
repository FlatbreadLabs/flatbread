# Query reference: filters, sorting, pagination, and field overrides

This page documents the arguments Flatbread's GraphQL read interface accepts,
plus the two config options that shape the generated schema: per-collection
`overrides` and the global `fieldNameTransform`. Every claim here matches the
current implementation in `packages/core`.

## Which queries take which arguments

For a collection named `Post`, the generated schema exposes two top-level
queries:

| Query          | Arguments                                    |
| -------------- | -------------------------------------------- |
| `allPosts`     | `filter`, `sortBy`, `order`, `skip`, `limit` |
| `Post(id: ID)` | `id`                                         |

Only the `all*` list queries accept `filter`. A third resolver — find many by
IDs, with `ids`, `sortBy`, `order`, `skip`, and `limit` but no `filter` —
backs list-valued relation fields such as `Post.authors`; it is not mounted
as its own top-level query.

## Order of application

For a list query, Flatbread applies the arguments in this order:

1. `filter` narrows the collection.
2. `sortBy` sorts the surviving records by one field.
3. `order: DESC` reverses the sorted list (`ASC` is the default).
4. `skip` and `limit` slice the result (see the slice caveat under
   [`skip` and `limit`](#skip-and-limit)).

## `filter`

`filter` takes a JSON object whose shape mirrors the path to the value you
want to compare. The deepest key that does not hold another object names the
comparison operation; its value is the target to compare against. The syntax
follows a subset of MongoDB's query style.

```graphql
query HighlyRated {
  allPosts(filter: { rating: { gt: 80 } }) {
    id
    title
    rating
  }
}
```

That filter keeps every post whose `rating` field is greater than 80. Nested
paths work the same way: `{ postMeta: { rating: { gt: 80 } } }` compares
`postMeta.rating` on each record.

### Combining filters: peer paths AND together

Peer keys inside one filter object must **all** match. This is a logical AND,
not a union:

```graphql
query FilteredPosts {
  allPosts(filter: { title: { wildcard: "*tion" }, rating: { gt: 80 } }) {
    title
  }
}
```

A post appears in the result only when its title ends in `tion` **and** its
rating exceeds 80. There is no OR combinator across paths; run two queries or
use `in` on one field when you need one.

### The 14 operations

| Operation                | Meaning                                              | Notes                                                                                                                                  |
| ------------------------ | ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `eq`                     | `fieldValue === target`                              | Strict equality.                                                                                                                       |
| `ne`                     | `fieldValue !== target`                              | Strict inequality.                                                                                                                     |
| `lt`, `lte`, `gt`, `gte` | `<`, `<=`, `>`, `>=`                                 | Both sides must be a string, number, or boolean; anything else compares as `false` (the record is excluded).                           |
| `in`                     | `target.includes(fieldValue)`                        | Target must be an array; throws otherwise.                                                                                             |
| `nin`                    | `!target.includes(fieldValue)`                       | Target must be an array; throws otherwise.                                                                                             |
| `includes`               | field contains the target                            | Field must be an array or string; throws otherwise. String matching follows `String.prototype.includes`.                               |
| `excludes`               | field does not contain the target                    | Same field requirements as `includes`.                                                                                                 |
| `exists`                 | `target ? field != undefined : field == undefined`   | Loose check: treats `null` and `undefined` alike.                                                                                      |
| `strictlyExists`         | `target ? field !== undefined : field === undefined` | Strict check: `null` counts as existing.                                                                                               |
| `regex`                  | `target.test(field)`                                 | See the `regex` limits below.                                                                                                          |
| `wildcard`               | loose string matching                                | Case-insensitive; accepts one pattern string or an array of patterns; uses the [matcher](https://github.com/sindresorhus/matcher) API. |

For `regex` and `wildcard`, a string-array field matches when **any** element
matches.

When the filter path is exactly the top-level `id` field, Flatbread
normalizes both sides for `eq`, `ne`, `in`, and `nin`, so IDs compare
consistently with how records are keyed.

### `regex` limits

The `regex` implementation requires an actual JavaScript `RegExp` object as
the target value and throws otherwise. Standard GraphQL JSON variables cannot
carry a `RegExp` instance, so `regex` only works where the caller constructs
the filter in JavaScript and can pass a real `RegExp` — it is not usable from
a plain GraphQL document with JSON variables. Use `wildcard` for loose
matching from GraphQL clients.

### Dates

Filters cannot infer date strings and compare them as `Date` values. A `Date`
object passed programmatically may work but is not extensively tested. To fix
this properly, add type checks and comparators in
`packages/core/src/utils/sift.ts` and open a pull request.

## `sortBy` and `order`

`sortBy` accepts one root-level field name and sorts ascending by default.
Records whose field values are not sortable against each other (not both
strings, numbers, or booleans) keep their relative order. `order` accepts
`ASC` or `DESC`; `DESC` reverses the list after sorting.

## `skip` and `limit`

`skip` drops the first `n` records. `limit` bounds the result. Both accept
integers.

One implementation caveat matters when you combine them: the result is
computed as `records.slice(skip, limit)`, so **when `skip` is set, `limit`
acts as the slice end index, not a page size**. For example, `skip: 10, limit: 15` returns records 11 through 15 (five records), and `skip: 10, limit: 5` returns nothing. Without `skip`, `limit: 5` returns the first five
records as you would expect. Account for this when paging: to fetch a page of
`n` records after skipping `s`, pass `limit: s + n`.

## Field overrides

Overrides define a custom GraphQL type or resolver on top of a field in one
collection — for example to
[optimize images](https://github.com/FlatbreadLabs/flatbread/tree/main/packages/resolver-svimg)
or reshape a value at read time.

`overrides` is an array on each **content entry**, not a global config key:

```js
export default defineConfig({
  source: sourceFilesystem(),
  transformer: transformerMarkdown(),
  content: [
    {
      path: 'content/markdown/authors',
      collection: 'Author',
      overrides: [
        {
          // The source field name.
          field: 'name',
          // The GraphQL type to expose.
          type: 'String',
          // Transform the value before returning it.
          resolve: (name) => String(name).toUpperCase(),
        },
      ],
    },
  ],
});
```

Each override takes `field`, `type`, `resolve`, and optional `args` and
`description`. The `resolve` function receives the raw field value plus an
object with `source`, `context`, and `args`.

### Supported `field` path syntax

| Pattern                 | Meaning                                                |
| ----------------------- | ------------------------------------------------------ |
| `nested.object`         | A field inside a nested object                         |
| `an.array[]`            | Map over every element of an array field               |
| `an.array[]with.object` | Map over an array and reach into each element's object |

The Next.js example config
([`examples/nextjs/flatbread.config.js`](https://github.com/FlatbreadLabs/flatbread/blob/main/examples/nextjs/flatbread.config.js))
exercises all three patterns on its `OverrideTest` collection and uses
`createSvImgField` from `@flatbread/resolver-svimg` on the `Author`
collection.

## `fieldNameTransform`

`fieldNameTransform` is a top-level config function that rewrites every field
name before schema generation. The default removes spaces by capitalizing the
letter that follows each one (`date joined` becomes `dateJoined`); it changes
nothing else. Override it when you need a different global naming rule:

```js
export default defineConfig({
  // Replace all spaces in field names with an underscore.
  fieldNameTransform: (fieldName) => fieldName.replace(/\s/g, '_'),
  // ...
});
```

The transform applies to schema fields, override paths, and `refs` lookups
consistently, so a `refs` key declared with the raw field name still resolves
after transformation.
