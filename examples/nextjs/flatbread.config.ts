import { defineConfig } from 'flatbread';
import { sourceFilesystem } from '@flatbread/source-filesystem';
import { transformMarkdown } from '@flatbread/transformer-markdown';
import { transformYaml } from '@flatbread/transformer-yaml';
import { createSvImgField } from '@flatbread/resolver-svimg';

const transformerConfig = {
  markdown: {
    gfm: true,
    externalLinks: true,
  },
};

export default defineConfig({
  source: sourceFilesystem(),
  transformer: [transformMarkdown(transformerConfig), transformYaml()],
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
      overrides: [
        createSvImgField('image', {
          inputDir: 'static/authorImages',
          outputDir: 'static/g',
          srcGenerator: (path) => '/g/' + path,
        }),
      ],
    },
    {
      path: 'content/yaml/authors',
      collection: 'YamlAuthor',
      refs: {
        friend: 'YamlAuthor',
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
        {
          field: 'array[]',
          type: 'String',
          resolve: (source) => source.map((s: any) => s.toUpperCase()),
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
