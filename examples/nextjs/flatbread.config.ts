import {
  transformerMarkdown,
  sourceFilesystem,
  type FlatbreadConfig,
} from 'flatbread';

const transformerConfig = {
  markdown: {
    gfm: true,
    externalLinks: true,
  },
};
const config = {
  source: sourceFilesystem(),
  transformer: transformerMarkdown(transformerConfig),

  content: [
    {
      path: '../../packages/flatbread/content/posts',
      name: 'Post',
      refs: {
        authors: 'Author',
      },
    },
    {
      path: '../../packages/flatbread/content/authors',
      name: 'Author',
      refs: {
        friend: 'Author',
      },
    },
  ],
} as FlatbreadConfig;

export default config;
