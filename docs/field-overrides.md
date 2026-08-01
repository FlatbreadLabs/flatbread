# Field overrides and advanced config

Overrides let you place a custom GraphQL type or resolver on top of any field in
your content, which is how you [optimize
images](../packages/resolver-svimg/readme.md), encapsulate an endpoint, or
reshape a value on its way out.

For the arguments every list field accepts, see [query
arguments](./query-arguments.md), and for installation and usage see [the main
README](../README.md).

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
[graphql-compose resolver
docs](https://graphql-compose.github.io/docs/basics/what-is-resolver.html).

The Next.js example wires several of these, including an
[svimg](../packages/resolver-svimg/readme.md) image field on `Author`, which you
can read in full inside
[`examples/nextjs/flatbread.config.js`](../examples/nextjs/flatbread.config.js).

## `fieldNameTransform`

Accepts a function that receives field names and rewrites them for GraphQL
schema generation, which Flatbread uses internally to strip spaces and which you
can use for any other global rename.

```js
{
  // Replace every space in a field name with an underscore.
  fieldNameTransform: (fieldName) => fieldName.replace(/\s/g, '_');
}
```
