# Query arguments

Every list field in the generated GraphQL schema takes the same four arguments.
Flatbread applies them in this order: `filter`, then `sortBy` with `order`, then
`skip`, then `limit`.

For what a collection, record, and relation are, see the
[glossary](./glossary.md). For the README, see
[the main README](../README.md).

## `filter`

`filter` narrows the results of a list field. Any leaf field can be used in a
filter.

The syntax is a subset of
[MongoDB's query syntax](https://docs.mongodb.com/manual/reference/operator/query/).

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
    collection. A record that omits the field fails the query with
    `Comparator "includes" requires an array or string field.`
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

Flatbread cannot infer date strings and then compare `Date` types in filters. It
should work if your client passes a `Date` object, though that path is not
tested much. To fix it, add argument `typeof` checks and the matching comparator
functions in
[`packages/core/src/utils/sift.ts`](../packages/core/src/utils/sift.ts), then
open a pull request.

### Combining filters

Add peer objects inside one filter object to point at several paths at once.
Flatbread unions them.

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

Sorts by the named field. Takes a root-level field name. Defaults to no sorting.

## `order`

The direction of the sort. Takes `ASC` or `DESC`. Defaults to `ASC`.

## `skip`

Skips the given number of entries. Takes an integer.

## `limit`

Caps the number of returned entries. Takes an integer.
