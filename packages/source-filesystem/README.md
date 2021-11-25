# @flatbread/source-filesystem 🗃

> Transform files into content that can be fetched with GraphQL.

## 💾 Install

Use `pnpm`, `npm`, or `yarn`:

```bash
pnpm i @flatbread/source-filesystem
```

## 👩‍🍳 Usage

Add the source as a property of the default export within your `flatbread.config.js` file:

```js
// flatbread.config.js
import defineConfig from '@flatbread/config';
import transformer from '@flatbread/transformer-markdown';
import filesystem from '@flatbread/source-filesystem';

const transformerConfig = {
  markdown: {
    gfm: true,
    externalLinks: true,
  },
};
export default defineConfig({
  source: filesystem(),
  transformer: transformer(transformerConfig),
  content: [
    {
      path: 'content/posts',
      typeName: 'Post',
    },
  ],
});
```

A filesystem source will also require a transformer in order to parse the files into the proper internal schema. The example above is looking for a set of [Markdown](https://en.wikipedia.org/wiki/Markdown) files, so in order to let [Flatbread](https://github.com/tonyketcham/flatbread) understand the content of markdown (.md, .markdown, .mdx) files, you must install [@flatbread/transformer-markdown](https://www.npmjs.com/package/@flatbread/transformer-markdown) as a dependency. Register the transformer which coresponds to your content filetype as the `transformer` property in your `flatbread.config.js`.

### Options

#### content

- Type: [`Content`](https://github.com/tonyketcham/flatbread/blob/main/packages/core/src/types.ts) _required_

An array of content types - each of which will appear in GraphQL.

#### typeName

- Type: `string`
- Default: `'FileNode'`

The name for this content type that will appear in GraphQL.

#### path

- Type: `string` _required_

Where to look for files of the current content type.

#### refs

- Type: `object`

Define fields that will have a reference to another node. The referenced `typeName` is expected to exist within an element of the `content` array.

```js
export default defineConfig({
  source: filesystem(),
  transformer: transformer(transformerConfig),
  content: [
    {
      path: 'content/posts',
      typeName: 'Post',
      refs: {
        author: 'Author',
      },
    },
    {
      path: 'content/authors',
      typeName: 'Author',
    },
  ],
});
```
