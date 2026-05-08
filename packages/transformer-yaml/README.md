# @flatbread/transformer-yaml 🐪

> Transform [YAML](https://en.wikipedia.org/wiki/YAML) into Flatbread collection entries (often consumed through GraphQL in the default setup).

## 💾 Install

Use `pnpm`, `npm`, or `yarn`:

```bash
pnpm i @flatbread/transformer-yaml
```

## 👩‍🍳 Usage

Pair this with a compatible source plugin in your `flatbread.config.js` file:

```js
// flatbread.config.js
import { defineConfig, sourceFilesystem, transformerMarkdown } from 'flatbread';
import transformerYaml from '@flatbread/transformer-yaml';

export default defineConfig({
  source: sourceFilesystem(),
  transformer: [transformerMarkdown(), transformerYaml()],
  content: [
    {
      path: 'content/yaml/posts',
      collection: 'YamlPost',
    },
  ],
});
```

### Options

This transformer plugin currently does not accept any config options. It supports all valid yaml syntax flavors by default.

Refer to your source plugin's documentation for the relevant `content` Flatbread config option.

If you're using a CMS like NetlifyCMS, you'll want to pair this with the [`source-filesystem`](https://github.com/FlatbreadLabs/flatbread/blob/main/packages/source-filesystem/README.md) plugin.
