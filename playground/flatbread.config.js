// import transformer from '@flatbread/transformer-yaml';
import {
  defineConfig,
  markdownTransformer,
  yamlTransformer,
  filesystem,
} from 'flatbread';

const transformerConfig = {
  markdown: {
    gfm: true,
    externalLinks: true,
  },
};
export default defineConfig({
  source: filesystem(),
  transformer: {
    '*.{markdown,md,mdx}': markdownTransformer(transformerConfig),
    '*.{yaml,yml}': yamlTransformer(),
  },
  // source: filesystem({ extensions: ['.yml', '.yaml'] }),
  // transformer: transformer(),

  content: [
    {
      path: 'content/markdown/posts',
      collection: 'Post',
      refs: {
        authors: 'Author',
      },
    },
    {
      path: 'content/markdown/authors',
      collection: 'Author',
      refs: {
        friend: 'Author',
      },
    },
    {
      path: 'content/yaml/authors',
      collection: 'YamlAuthor',
      refs: {
        friend: 'YamlAuthor',
      },
    },
  ],
});
