// import transformer from '@flatbread/transformer-yaml';
import { defineConfig, markdownTransforer, filesystem } from 'flatbread';

const transformerConfig = {
  markdown: {
    gfm: true,
    externalLinks: true,
  },
};

function flatbreadImage(field, opts) {
  return {
    field,
    type: `type FlatbreadImage { src: String alt: String }`,
    resolve(source) {
      return {
        alt: 'a nice description',
        src: source,
      };
    },
  };
}

export default defineConfig({
  source: filesystem(),
  transformer: markdownTransforer(transformerConfig),
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
      path: 'content/markdown/posts/[category]/[slug].md',
      collection: 'PostCategory',
      refs: {
        authors: 'Author',
      },
    },
    {
      path: 'content/markdown/posts/**/*.md',
      collection: 'PostCategoryBlob',
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
      path: 'content/markdown/deeply-nested',
      collection: 'OverrideTest',
      overrides: [
        {
          field: 'deeply.nested',
          type: 'String',
          resolve: (source) => String(source).toUpperCase(),
        },
        flatbreadImage('image'),
        flatbreadImage('image2'),

        {
          field: 'array[]',
          type: 'String',
          resolve: (source) => source.map((s) => s.toUpperCase()),
        },
        {
          field: 'array2[]obj',
          type: 'String',
          resolve: (source) => source.toUpperCase(),
        },
        {
          field: 'array3[]obj.test',
          type: 'String',
          resolve: (source) => source.toUpperCase(),
        },
      ],
    },
  ],
});
