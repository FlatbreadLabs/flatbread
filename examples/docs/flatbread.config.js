import {
  defineConfig,
  transformerMarkdown,
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
  transformer: transformerMarkdown(transformerConfig),
  content: [
    {
      // Top-level guides only. `experiments/` and `research/` subdirectories
      // under docs/ are excluded because readdir is non-recursive and the
      // `*.md` glob matches only files directly in docs/.
      path: 'content/markdown/docs/*.md',
      collection: 'DocPage',
    },
  ],
  codegen: {
    enabled: true,
    outputDir: './generated',
    outputFile: 'graphql.ts',
    plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
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
    documents: [
      './**/*.graphql',
      './**/*.gql',
      './app/**/*.graphql',
    ],
    schema: {
      includeIntrospection: false,
      includeDeprecated: true,
    },
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
