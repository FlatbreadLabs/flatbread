const config = {
  identifier: {
    method: 'field',
    field: 'id',
  },
  content: [
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
    {
      path: 'content/authors/*.md',
      typeName: 'Author',
    },
    {
      path: 'content/categories/*.md',
      typeName: 'Category',
    },
    {
      path: 'content/styles/*.md',
      typeName: 'Style',
      refs: {
        category: 'Category',
      },
    },
    {
      path: 'content/cultivars/*.md',
      typeName: 'Varietal',
      refs: {
        style: 'Style',
      },
    },
    {
      path: 'content/origins/*.md',
      typeName: 'Origin',
    },
    {
      path: 'content/tags/*.md',
      typeName: 'Tags',
    },
    {
      path: 'content/vendors/*.md',
      typeName: 'Vendor',
    },
    {
      path: 'content/sluggified/*.md',
      typeName: 'Sluggified',
      identifier: {
        method: 'slug',
      },
    },
  ],
  mdsvex: {
    extensions: ['.svelte.md', '.md', '.svx'],

    smartypants: {
      // dashes: 'oldschool'
    },

    remarkPlugins: [],
    rehypePlugins: [],
  },
};
export default config;
