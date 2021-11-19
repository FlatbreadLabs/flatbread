import defineConfig from '@oyu/config';
import transformer from '@oyu/transformer-markdown';
import filesystem from '@oyu/source-filesystem';

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
    },
  ],
});
