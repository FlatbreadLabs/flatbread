import defineConfig from '@flatbread/config';
import transformer from '@flatbread/transformer-markdown';
// import transformer from '@flatbread/transformer-yaml';
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
  // source: filesystem({ extensions: ['.yml', '.yaml'] }),
  // transformer: transformer(),

  content: [
    {
      path: 'content/markdown/posts',
      typeName: 'Post',
      refs: {
        authors: 'Author',
      },
    },
    {
      path: 'content/markdown/authors',
      typeName: 'Author',
      refs: {
        friend: 'Author',
      },
    },
  ],
});
