# @flatbread/codegen 🏗️

> Automatic TypeScript type generation for Flatbread GraphQL schemas

## 💾 Install

Use `pnpm`, `npm`, or `yarn`:

```bash
pnpm add @flatbread/codegen
```

## 🎯 Overview

This package automatically generates TypeScript types from your Flatbread GraphQL schema, providing type safety for your GraphQL operations. It uses [GraphQL Code Generator](https://www.the-guild.dev/graphql/codegen) under the hood with intelligent caching to avoid unnecessary regeneration.

## 👩‍🍳 Basic Usage

### 1. Add codegen configuration to your `flatbread.config.ts`:

```ts
import { defineConfig, sourceFilesystem, transformerMarkdown } from 'flatbread';

export default defineConfig({
  source: sourceFilesystem(),
  transformer: transformerMarkdown(),
  content: [
    {
      path: 'content/posts',
      collection: 'Post',
    },
  ],
  // Add codegen configuration
  codegen: {
    enabled: true,
    outputDir: './src/generated',
    outputFile: 'graphql.ts',
    plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
  },
});
```

### 2. Generate types:

```bash
# Generate types once
npx flatbread codegen

# Watch for changes and regenerate
npx flatbread codegen --watch

# Force regeneration (clear cache)
npx flatbread codegen --clear-cache
```

### 3. Use generated types in your application:

```ts
import type { Post, GetPostsQuery } from './generated/graphql';
import { request } from 'graphql-request';

// Use the generated types
const posts: Post[] = await request<GetPostsQuery>(`
  query GetPosts {
    posts {
      id
      title
      content
    }
  }
`);
```

## 👀 Watch Mode

The `--watch` flag enables automatic regeneration of TypeScript types whenever your source files change. This is particularly useful during development to keep your types in sync with your content and schema changes.

### How Watch Mode Works

When you run codegen with `--watch`, it monitors:

1. **Flatbread config files** (`flatbread.config.*`) - Config changes trigger full regeneration
2. **Content directories** - Changes to your markdown/content files update the schema
3. **GraphQL documents** - Modifications to `.graphql` files regenerate operation types

```bash
# Start watch mode
npx flatbread codegen --watch

# Watch with verbose output
npx flatbread codegen --watch --verbose
```

### Example Output

```
🥯 Flatbread TypeScript Code Generator
Generating GraphQL schema...
🔍 Watching for changes...
Watching patterns: flatbread.config.*, content/posts/**/*.{md,mdx,markdown}, src/**/*.graphql
✓ Generated TypeScript types: /path/to/src/generated/graphql.ts
👀 Ready for changes

📝 File changed: content/posts/new-article.md
🔄 Regenerating schema and types...
✅ Types regenerated successfully
```

### Watch Mode Features

- **Intelligent debouncing** - Prevents rapid successive regenerations
- **Error recovery** - Watch continues even if regeneration fails
- **Graceful shutdown** - Use `Ctrl+C` to stop watching
- **Pattern filtering** - Ignores `node_modules`, `.git`, and output directories
- **Full schema regeneration** - Content changes trigger complete schema rebuild

## ⚙️ Configuration

### Basic Configuration

```ts
export interface CodegenOptions {
  // Whether to enable code generation
  enabled?: boolean; // default: false

  // Output directory for generated types
  outputDir?: string; // default: './src/generated'

  // Output filename for generated types
  outputFile?: string; // default: 'graphql.ts'

  // Plugins to use for code generation
  plugins?: string[]; // default: ['typescript', 'typescript-operations', 'typed-document-node']

  // Whether to watch for changes
  watch?: boolean; // default: false

  // Whether to use caching to avoid regeneration
  cache?: boolean; // default: true

  // Additional GraphQL documents to include
  documents?: string[];
}
```

### Advanced Configuration

```ts
export default defineConfig({
  // ... other config
  codegen: {
    enabled: true,
    outputDir: './src/types',
    outputFile: 'schema.generated.ts',
    plugins: ['typescript', 'typescript-operations'],

    // Plugin-specific configuration
    pluginConfig: {
      typescript: {
        enumsAsTypes: true,
        scalars: {
          DateTime: 'Date',
          JSON: 'Record<string, unknown>',
        },
      },
      typescriptOperations: {
        skipTypename: false,
      },
    },

    // Include GraphQL documents from your app
    documents: ['./src/**/*.graphql', './src/**/*.gql'],

    // Custom GraphQL Code Generator configuration
    codegenConfig: {
      config: {
        namingConvention: 'keep',
        declarationKind: 'interface',
      },
    },
  },
});
```

## 🚀 Programmatic Usage

```ts
import { generateTypes } from '@flatbread/codegen';
import { generateSchema } from '@flatbread/core';
import { loadConfig } from '@flatbread/config';

// Load your Flatbread configuration
const configResult = await loadConfig();
if (!configResult.config) {
  throw new Error('Failed to load config');
}

// Generate the GraphQL schema
const schema = await generateSchema(configResult);

// Generate TypeScript types
const result = await generateTypes(schema, configResult.config, {
  enabled: true,
  outputDir: './src/generated',
  outputFile: 'types.ts',
});

if (result.success) {
  console.log('Types generated:', result.files);
} else {
  console.error('Generation failed:', result.error);
}
```

## 🔄 Caching

The package includes intelligent caching to avoid regenerating types when nothing has changed:

- **Configuration Hash**: Tracks changes to your Flatbread configuration
- **Schema Hash**: Tracks changes to the generated GraphQL schema
- **Document Hash**: Tracks changes to included GraphQL documents

Types are only regenerated when one of these changes. You can force regeneration by:

```bash
# Clear cache and regenerate
npx flatbread codegen --clear-cache

# Disable caching entirely
npx flatbread codegen --no-cache
```

## 🎛️ CLI Options

```bash
npx flatbread codegen [options]

Options:
  --config <path>        Path to Flatbread config file
  --output-dir <dir>     Output directory for generated types
  --output-file <file>   Output filename for generated types
  --watch               Watch for changes and regenerate
  --clear-cache         Clear cache and force regeneration
  --documents <paths>   Additional document paths (comma-separated)
  --verbose             Enable verbose logging
```

## 🔌 Supported Plugins

The package supports all GraphQL Code Generator plugins, with these defaults:

- **typescript**: Generates base TypeScript types from schema
- **typescript-operations**: Generates types for GraphQL operations
- **typed-document-node**: Generates TypedDocumentNode for type-safe operations

## 🤝 Framework Integration

### React with Apollo Client

```ts
import { useQuery } from '@apollo/client';
import { GetPostsDocument, type GetPostsQuery } from './generated/graphql';

function Posts() {
  const { data, loading, error } = useQuery<GetPostsQuery>(GetPostsDocument);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      {data?.posts.map((post) => (
        <article key={post.id}>
          <h2>{post.title}</h2>
          <p>{post.content}</p>
        </article>
      ))}
    </div>
  );
}
```

### Next.js with GraphQL Request

```ts
import { request } from 'graphql-request';
import { GetPostsDocument, type GetPostsQuery } from './generated/graphql';

export async function getStaticProps() {
  const data = await request<GetPostsQuery>(
    'http://localhost:5050/graphql',
    GetPostsDocument
  );

  return {
    props: {
      posts: data.posts,
    },
  };
}
```

### SvelteKit

```ts
import { request } from 'graphql-request';
import { GetPostsDocument, type GetPostsQuery } from './generated/graphql';

export async function load() {
  const data = await request<GetPostsQuery>(
    'http://localhost:5050/graphql',
    GetPostsDocument
  );

  return {
    posts: data.posts,
  };
}
```

## 🏗️ Architecture

The package follows a modular architecture:

```
@flatbread/codegen
├── types.ts          # Type definitions and interfaces
├── hash.ts           # Configuration and schema hashing
├── cache.ts          # Cache management
├── generator.ts      # Core type generation logic
├── cli.ts            # CLI command implementation
└── index.ts          # Public API exports
```

## 🐛 Troubleshooting

### Common Issues

**Types not regenerating after schema changes**

- Clear the cache: `npx flatbread codegen --clear-cache`
- Check that your Flatbread config is being properly loaded

**Import errors in generated types**

- Ensure all required packages are installed
- Check that the output directory is correctly configured

**Performance issues with large schemas**

- Enable caching (default): `cache: true`
- Consider using fewer plugins if you don't need all features
- Use `documents` to limit scope to specific operations

### Debug Mode

```bash
npx flatbread codegen --verbose
```

This will show:

- Configuration loading details
- Schema generation progress
- Cache hit/miss information
- File generation results

## 📝 Examples

Check out the `/examples` directory for complete working examples:

- **Next.js**: Full-stack example with SSG/SSR
- **SvelteKit**: SPA and SSR examples
- **React**: Client-side rendering with Apollo
- **Node.js**: Server-side GraphQL client

## 🤝 Contributing

We welcome contributions! Please see the main [Flatbread contributing guide](../../CONTRIBUTING.md) for details.

## 📄 License

MIT © [Tony Ketcham](https://github.com/tonyketcham)
