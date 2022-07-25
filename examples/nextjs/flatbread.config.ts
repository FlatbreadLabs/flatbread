import {
  markdownTransformer,
  filesystem,
  type FlatbreadConfig,
} from 'flatbread';

const transformerConfig = {
  markdown: {
    gfm: true,
    externalLinks: true,
  },
};
const config = {
  source: filesystem(),
  transformer: markdownTransformer(transformerConfig),

  content: [
    {
      path: '../../packages/flatbread/content/posts',
      collection: 'Post',
      refs: {
        authors: 'Author',
      },
    },
    {
      path: '../../packages/flatbread/content/authors',
      collection: 'Author',
      refs: {
        friend: 'Author',
      },
    },
  ],
} as FlatbreadConfig;

export default config;
