// import transformer from '@flatbread/transformer-yaml';
import { defineConfig, markdownTransforer, filesystem } from 'flatbread';
import { createSvImgField } from '@flatbread/resolver-svimg';

const transformerConfig = {
  markdown: {
    gfm: true,
    externalLinks: true,
  },
};

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
        createSvImgField('image'),
        {
          field: 'deeply.nested',
          type: 'String',
          resolve: (source) => String(source).toUpperCase(),
        },
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
