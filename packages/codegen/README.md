# @flatbread/codegen 🏗️

> TypeScript generation for Flatbread read interfaces

Flatbread treats repo files as **relational, Git-tracked content** for TypeScript apps; GraphQL is one **read interface** over the typed model Flatbread derives from flat files and config. Codegen keeps GraphQL operations typed and emits model-derived TypeScript helpers for collection-shaped reads.

## 💾 Install

Use `pnpm`, `npm`, or `yarn`:

```bash
pnpm add @flatbread/codegen
```

## 🎯 Overview

This package generates TypeScript from the Flatbread model so apps can read typed content through the interface that fits the call site. It uses [GraphQL Code Generator](https://www.the-guild.dev/graphql/codegen) under the hood for schema and operation types, and also emits a prototype generated TypeScript read API derived from your configured collections, fields, and refs.

For the canonical posts/authors/tags walkthrough and the contract for choosing GraphQL versus the generated TypeScript read API, see the canonical [Quickstart](../flatbread/README.md#quickstart-posts-authors-and-tags) and [Choosing a read interface](../flatbread/README.md#choosing-a-read-interface).

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
    outputDir: './generated',
    outputFile: 'graphql.ts',
    plugins: ['typescript', 'typescript-operations', 'typed-document-node'],
  },
});
```

### 2. Add `.flatbread-codegen-cache.json` to your `.gitignore`.

### 3. Generate types:

```bash
# Generate types once
pnpm exec flatbread codegen

# Watch for changes and regenerate
pnpm exec flatbread codegen --watch

# Force regeneration (clear cache)
pnpm exec flatbread codegen --clear-cache
```

Use `flatbread start --watch -- <app command>` for one process that runs your
app and regenerates code; follow the
[unified local development loop](https://flatbreadlabs.github.io/flatbread/docs/local-dev-loop/).

### 4. Use the generated output in your application:

Use **GraphQL operations** when you want explicit documents, custom selections, GraphQL clients, persisted operations, or direct access to the GraphQL endpoint:

```ts
import type { GetPostsQuery } from './generated/graphql';
import { request } from 'graphql-request';

const data = await request<GetPostsQuery>(
  'http://localhost:5057/graphql',
  `
    query GetPosts {
      allPosts {
        id
        title
        _content {
          html
        }
      }
    }
  `
);

const posts = data.allPosts;
```

Use the prototype **generated TypeScript read API** when you want collection-shaped helpers for common reads from the configured content model. In the canonical Next.js example, `createFlatbreadReadApi()` reads posts, authors, and tags with a generated default selection while executing through the GraphQL layer:

```ts
import { createFlatbreadReadApi } from './generated/graphql';
import { graphqlFetch } from './lib/graphql';

const read = createFlatbreadReadApi(
  async <TData>(source: string, variables?: Record<string, unknown>) =>
    graphqlFetch<TData>(source, variables)
);
const posts = await read.Post.all();
const authorNames = posts[0]?.authors?.map((author) => author.name);
const tags = posts[0]?.tags;
```

## 👀 Watch Mode (watch-only)

The `--watch` flag enables automatic regeneration while the process stays running—**watch-only**; use one-shot `flatbread codegen` when you need a single generation (for example in CI).

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
Watching patterns: flatbread.config.*, content/**/*.{md,mdx,markdown,yml,yaml}, **/*.graphql
✓ Generated TypeScript types: /path/to/generated/graphql.ts
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
  outputDir?: string; // default: './generated'

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
    documents: ['./queries/**/*.graphql', './**/*.graphql'],

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
  outputDir: './generated',
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
pnpm exec flatbread codegen --clear-cache

# Or set codegen.cache to false in flatbread.config.* for non-cached runs
```

Watch mode (`--watch`) is **watch-only**: leave it running during development; use a one-shot `flatbread codegen` (without `--watch`) when you only need a single generation.

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

### Plugin Dependencies

⚠️ **Important**: Some plugins generate code that imports external packages. You'll need to install these dependencies in your project:

```bash
# Required for 'typed-document-node' and 'typescript-operations' plugins
npm install @graphql-typed-document-node/core
```

### Plugin Presets

To simplify plugin management and avoid dependency issues, you can use predefined presets:

```ts
export default defineConfig({
  codegen: {
    enabled: true,
    preset: 'basic', // or 'operations' or 'full'
  },
});
```

Available presets:

- **`basic`**: TypeScript types only (no external dependencies)
  - Uses: `['typescript']`
- **`operations`**: TypeScript with operations support
  - Uses: `['typescript', 'typescript-operations']`
  - Requires: `@graphql-typed-document-node/core`
- **`full`**: Full featured with typed document nodes (default)
  - Uses: `['typescript', 'typescript-operations', 'typed-document-node']`
  - Requires: `@graphql-typed-document-node/core`

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
      {data?.allPosts.map((post) => (
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
    'http://localhost:5057/graphql',
    GetPostsDocument
  );

  return {
    props: {
      posts: data.allPosts,
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
    'http://localhost:5057/graphql',
    GetPostsDocument
  );

  return {
    posts: data.allPosts,
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

If you see errors like `Cannot find module '@graphql-typed-document-node/core'`:

1. Install the missing dependency:

   ```bash
   npm install @graphql-typed-document-node/core
   ```

2. Or use a simpler preset that doesn't require external dependencies:

   ```ts
   codegen: {
     enabled: true,
     preset: 'basic', // Only generates basic TypeScript types
   }
   ```

3. Or customize plugins to exclude ones that require dependencies:
   ```ts
   codegen: {
     enabled: true,
     plugins: ['typescript'], // Only basic types, no external deps
   }
   ```

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
