# @flatbread/transformer-yaml 🐪

> Transform [YAML](https://en.wikipedia.org/wiki/YAML) files into content that can be fetched with GraphQL.

## 💾 Install

Use `pnpm`, `npm`, or `yarn`:

```bash
pnpm i @flatbread/transformer-yaml
```

## 👩‍🍳 Usage

Pair this with a compatible source plugin in your `flatbread.config.js` file:

```js
// flatbread.config.js
import defineConfig from '@flatbread/config';
import transformer from '@flatbread/transformer-markdown';
import filesystem from '@flatbread/source-filesystem';

export default defineConfig({
  source: filesystem({ extensions: ['.yml', '.yaml'] }),
  transformer: transformer(),
  content: [
    {
      path: 'content/posts',
      collection: 'Post',
      refs: {
        authors: 'Author',
      },
    },
    {
      path: 'content/authors',
      collection: 'Author',
      refs: {
        friend: 'Author',
      },
    },
  ],
});
```

### Options

This transformer plugin currently does not accept any config options. It supports all valid yaml syntax flavors by default.

Refer to your source plugin's documentation for the relevant `content` Flatbread config option.

If you're using a CMS like NetlifyCMS, you'll want to pair this with the [`source-filesystem`](https://github.com/tonyketcham/flatbread/blob/main/packages/source-filesystem/README.md) plugin.
