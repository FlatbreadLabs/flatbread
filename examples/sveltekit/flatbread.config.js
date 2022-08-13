import { createSvImgField } from '@flatbread/resolver-svimg';
import {
  defineConfig,
  transformerMarkdown,
  transformerYaml,
  sourceFilesystem,
} from 'flatbread';

const transformerConfig = {
  markdown: {
    gfm: true,
    externalLinks: true,
  },
};

export default defineConfig({
  source: sourceFilesystem(),
  transformer: [transformerMarkdown(transformerConfig), transformerYaml()],

  collectionResolvers: [
    function fakeResolver(schemaComposer, args) {
      const { name } = args;

      schemaComposer.Query.addFields({
        [`fake${name}`]: {
          type: 'String',
          description: `fake resolver`,
          resolve() {
            return `fake ${name}!`;
          },
        },
      });
    },
  ],

  content: [
    {
      path: 'content/markdown/posts',
      name: 'Post',
      refs: {
        authors: 'Author',
      },
    },
    {
      path: 'content/markdown/posts/[category]/[slug].md',
      name: 'PostCategory',
      refs: {
        authors: 'Author',
      },
    },
    {
      path: 'content/markdown/authors',
      name: 'Author',
      refs: {
        friend: 'Author',
      },
      overrides: [
        createSvImgField('image', {
          inputDir: 'static/authorImages',
          outputDir: 'static/g',
          srcGenerator: (path) => 'http://localhost:5174/g/' + path,
        }),
      ],
    },
    {
      path: 'content/yaml/authors',
      name: 'YamlAuthor',
      refs: {
        friend: 'YamlAuthor',
      },
    },
    {
      path: 'content/markdown/deeply-nested',
      name: 'OverrideTest',
      overrides: [
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
