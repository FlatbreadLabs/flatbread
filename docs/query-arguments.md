# Query arguments

Every list field in the generated GraphQL schema accepts the same four
arguments, and Flatbread applies them in a fixed order: `filter` first, then
`sortBy` together with `order`, then `skip`, and finally `limit`.

For definitions of a collection, a record, and a relation, see the
[glossary](./glossary.md), and for installation and usage see [the main
README](../README.md).

## `filter`

`filter` narrows the results of a list field, and any leaf field in your content
can be used inside a filter.

The syntax follows a subset of [MongoDB's query
syntax](https://docs.mongodb.com/manual/reference/operator/query/), covering
comparison, membership, existence, and pattern matching.

### Syntax

A filter is a nested object whose shape matches the path to the value you want
to compare on every entry in the collection. The deepest level that does not
hold a JSON object builds the comparison: the key is the operation and the value
is what every entry is compared against.

### Example

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

That filter returns the entries rated above 80:

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

### Supported operations

- `eq` — equal
  - Like `filterValue === resultValue` in JavaScript
- `ne` — not equal
  - Like `filterValue !== resultValue` in JavaScript
- `in`
  - Like `filterValue.includes(resultValue)` in JavaScript
  - Takes an array of values that pass strict comparison
- `nin`
  - Like `!filterValue.includes(resultValue)` in JavaScript
  - Takes an array of values that pass strict comparison
- `includes`
  - Like `resultValue.includes(filterValue)` in JavaScript
  - Takes a single value that passes strict comparison
  - The field must hold an array or a string on **every** entry in the
    collection. A record that omits the field fails the query with `Comparator "includes" requires an array or string field.`
- `excludes`
  - Like `!resultValue.includes(filterValue)` in JavaScript
  - Takes a single value that passes strict comparison
  - Same array-or-string requirement as `includes`
- `lt`, `lte`, `gt`, `gte`
  - Like `<`, `<=`, `>`, `>=`
  - Numbers, strings, and booleans only
- `exists`
  - Like `filterValue ? resultValue != undefined : resultValue == undefined`
  - Compares against `true` or `false`
  - Use it for a property that could be either `null` or `undefined`
- `strictlyExists`
  - Like `filterValue ? resultValue !== undefined : resultValue === undefined`
  - Compares against `true` or `false`
  - Use it to check for `undefined` alone
- `regex`
  - Like `new RegExp(filterValue).test(resultValue)` in JavaScript
- `wildcard`
  - A loose string match built on `regex`
  - Case insensitive
  - Uses [matcher](https://github.com/sindresorhus/matcher) and matcher's
    [API](https://github.com/sindresorhus/matcher#usage)

### Caveats

Flatbread cannot infer date strings and then compare `Date` types inside
filters, although it should work if your client passes an actual `Date` object,
a path that is not extensively tested. To fix it, add argument `typeof` checks
and the matching comparator functions in
[`packages/core/src/utils/sift.ts`](../packages/core/src/utils/sift.ts), then
open a pull request.

### Combining filters

Add peer objects inside one filter object to point at several paths
simultaneously, and Flatbread unions the resulting comparisons together.

Using the `entries` above:

```graphql
query FilteredPosts {
  allPosts(
    filter: { title: { wildcard: "*tion" }, postMeta: { rating: { gt: 80 } } }
  ) {
    title
  }
}
```

Returns:

```js
result = [{ title: 'My pretzel collection' }];
```

## `sortBy`

Sorts the results by the named field, accepting a root-level field name, and
defaults to no sorting at all.

## `order`

Controls the direction of the sort, accepting either `ASC` or `DESC`, and
defaults to `ASC` whenever you omit it.

## `skip`

Skips the given number of entries before returning anything, and accepts any
integer.

## `limit`

Limits the number of returned entries to whatever amount you specify, and
accepts any integer.
