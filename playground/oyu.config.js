import defineConfig from '@oyu/config';
import addSource from '@oyu/source-filesystem';
import useTransformer from '@oyu/transformer-markdown';

const transformerConfig = {
  markdown: {
    gfm: true,
    externalLinks: true,
  },
};
const transformer = useTransformer(transformerConfig);
export default defineConfig({
  content: [
    addSource(
      {
        path: 'content/sessions/*.md',
        typeName: 'Sessions',
        refs: {
          author: 'Author',
          style: 'Style',
          cultivar: 'Varietal',
          origin: 'Origin',
          vendor: 'Vendor',
          tags: 'Tags',
        },
      },
      transformer
    ),
    addSource(
      {
        path: 'content/sessions/*.md',
        typeName: 'Sessions',
        refs: {
          author: 'Author',
          style: 'Style',
          cultivar: 'Varietal',
          origin: 'Origin',
          vendor: 'Vendor',
          tags: 'Tags',
        },
      },
      transformer
    ),
    addSource(
      {
        path: 'content/authors/*.md',
        typeName: 'Author',
      },
      transformer
    ),
    addSource(
      {
        path: 'content/categories/*.md',
        typeName: 'Category',
      },
      transformer
    ),
    addSource(
      {
        path: 'content/styles/*.md',
        typeName: 'Style',
        refs: {
          category: 'Category',
        },
      },
      transformer
    ),
    addSource(
      {
        path: 'content/cultivars/*.md',
        typeName: 'Varietal',
        refs: {
          style: 'Style',
        },
      },
      transformer
    ),
    addSource(
      {
        path: 'content/origins/*.md',
        typeName: 'Origin',
      },
      transformer
    ),
    addSource(
      {
        path: 'content/tags/*.md',
        typeName: 'Tags',
      },
      transformer
    ),
    addSource(
      {
        path: 'content/vendors/*.md',
        typeName: 'Vendor',
      },
      transformer
    ),
    addSource(
      {
        path: 'content/sluggified/*.md',
        typeName: 'Sluggified',
        identifier: {
          method: 'slug',
        },
      },
      transformer
    ),
  ],
});
