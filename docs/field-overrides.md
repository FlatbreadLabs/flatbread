# Field overrides and advanced config

Overrides let you put a custom GraphQL type or resolver on top of a field in
your content. Use them to
[optimize images](../packages/resolver-svimg/readme.md), wrap an endpoint, or
reshape a value on the way out.

For the arguments every list field accepts, see
[query arguments](./query-arguments.md). For the README, see
[the main README](../README.md).

## Field overrides

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

### Supported syntax for `field`

- A nested object

  `nested.object`

- An array, which maps over the array values

  `an.array[]`

- A nested object inside an array, which also maps over the array

  `an.array[]with.object`

Overrides follow the `GraphQLFieldConfig` shape described in the
[graphql-compose resolver docs](https://graphql-compose.github.io/docs/basics/what-is-resolver.html).

The Next.js example wires several of these, including an
[svimg](../packages/resolver-svimg/readme.md) image field on `Author`. See
[`examples/nextjs/flatbread.config.js`](../examples/nextjs/flatbread.config.js).

## `fieldNameTransform`

Takes a function that receives field names and rewrites them for GraphQL schema
generation. Flatbread uses it internally to strip spaces, and you can use it for
any other global rename.

```js
{
  // Replace every space in a field name with an underscore.
  fieldNameTransform: (fieldName) => fieldName.replace(/\s/g, '_');
}
```
