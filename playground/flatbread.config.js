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
      refs: {
        author: 'Author',
      },
    },
    {
      path: 'content/authors',
      typeName: 'Author',
      refs: {
        friend: 'Author',
      },
    },
  ],
});
