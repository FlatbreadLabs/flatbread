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
          test: undefined,
          test2: null,
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
  // GraphQL TypeScript Code Generation Configuration
  codegen: {
    enabled: true,
    outputDir: './src/generated',
    outputFile: 'graphql.ts',
    plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
    
    // Plugin-specific configuration
    pluginConfig: {
      typescript: {
        enumsAsTypes: true,
        scalars: {
          DateTime: 'Date',
          JSON: 'Record<string, unknown>',
        },
        skipTypename: false,
      },
      typescriptOperations: {
        skipTypename: false,
      },
    },

    // Include any GraphQL documents from your app
    documents: [
      './src/**/*.graphql',
      './src/**/*.gql',
      './components/**/*.graphql',
    ],

    // Schema transformation options
    schema: {
      includeIntrospection: false,
      includeDeprecated: true,
    },

    // Custom GraphQL Code Generator configuration (optional)
    codegenConfig: {
      config: {
        namingConvention: 'change-case-all#pascalCase',
        declarationKind: 'interface',
        maybeValue: 'T | null',
        inputMaybeValue: 'T | null | undefined',
      },
    },
  },
});