# @flatbread/codegen

## 1.0.0-alpha.1

### 🎉 Initial Release

- **New package** for automatic TypeScript type generation from Flatbread GraphQL schemas
- **GraphQL Code Generator integration** with intelligent caching and hashing
- **CLI support** via `npx flatbread codegen` command
- **Comprehensive configuration options** including plugin customization
- **Framework-agnostic design** supporting React, Vue, Angular, Next.js, SvelteKit, and more

### ✨ Features

- **5 Codegen Strategies Analyzed**: Evaluated GraphQL Code Generator, gql.tada, GraphQL Request + React Query, Shopify's graphql-codegen, and urql + codegen
- **Intelligent Caching**: Avoid regeneration when Flatbread config and schema haven't changed
- **Hash-based Change Detection**: Uses SHA256 hashing of config, schema, and documents
- **Plugin System**: Full support for GraphQL Code Generator's extensive plugin ecosystem
- **Type Safety**: Generated TypeScript types for queries, mutations, and subscriptions
- **CLI Integration**: Seamless integration with existing `flatbread` CLI
- **Watch Mode**: Automatic regeneration on file changes
- **Cache Management**: Manual cache clearing and invalidation options

### 🏗️ Architecture

- **Modular Design**: Separate modules for hashing, caching, generation, and CLI
- **Peer Dependencies**: Lightweight integration with existing Flatbread packages
- **TypeScript-first**: Full TypeScript support with comprehensive type definitions
- **Testing**: Comprehensive test suite with vitest

### 📦 API

#### Configuration
```ts
interface CodegenOptions {
  enabled?: boolean;
  outputDir?: string;
  outputFile?: string;
  plugins?: string[];
  codegenConfig?: Partial<CodegenConfig>;
  pluginConfig?: Record<string, Record<string, any>>;
  watch?: boolean;
  cache?: boolean;
  documents?: string[];
  schema?: {
    includeIntrospection?: boolean;
    includeDeprecated?: boolean;
  };
}
```

#### Core Functions
- `generateTypes()` - Generate TypeScript types from GraphQL schema
- `generateTypesWithDocuments()` - Include GraphQL documents in generation
- `watchAndGenerate()` - Watch mode for automatic regeneration
- `hashCodegenInputs()` - Generate hash for change detection
- `loadCache()` / `saveCache()` - Cache management

#### CLI Commands
```bash
npx flatbread codegen                    # Generate types
npx flatbread codegen --watch            # Watch mode
npx flatbread codegen --clear-cache      # Force regeneration
npx flatbread codegen --verbose          # Detailed logging
```

### 🎯 Default Configuration

- **Plugins**: `['typescript', 'typescript-operations', 'typed-document-node']`
- **Output**: `./src/generated/graphql.ts`
- **Caching**: Enabled by default
- **Schema Options**: Include deprecated fields, exclude introspection

### 🤝 Framework Support

- **React**: Apollo Client, urql, React Query
- **Vue**: Vue Apollo, urql
- **Angular**: Apollo Angular
- **Next.js**: SSG/SSR with GraphQL Request
- **SvelteKit**: Load functions with GraphQL Request
- **Node.js**: Server-side GraphQL clients

### 📚 Documentation

- **Comprehensive README** with usage examples and configuration options
- **Comparative Analysis** of 5 different GraphQL codegen approaches
- **Framework Integration** guides for popular frontend frameworks
- **Troubleshooting** section with common issues and solutions

### 🧪 Testing

- **Hash Functions**: Comprehensive tests for configuration and schema hashing
- **Type Definitions**: Tests for default options and type safety
- **Vitest Integration**: Modern testing framework with TypeScript support

### 🔄 Dependencies

- **@graphql-codegen/cli**: ^5.0.0
- **@graphql-codegen/typescript**: ^4.1.6
- **@graphql-codegen/typescript-operations**: ^4.2.0
- **@graphql-codegen/typed-document-node**: ^2.3.0
- **@graphql-typed-document-node/core**: ^3.1.0
- **fs-extra**: ^11.1.0
- **kleur**: ^4.1.5

### 🎨 Examples

- **Next.js Configuration**: Complete example with codegen configuration
- **GraphQL Documents**: Sample queries and mutations for type generation
- **Framework Integration**: Examples for multiple frontend frameworks

### ⚡ Performance

- **Zero Runtime Overhead**: Generated types are compile-time only
- **Intelligent Caching**: Skip regeneration when nothing has changed
- **Fast Hashing**: SHA256-based change detection
- **Incremental Builds**: Only regenerate when necessary

### 🏃‍♂️ Getting Started

1. Add to your `flatbread.config.ts`:
```ts
export default defineConfig({
  // ... your existing config
  codegen: {
    enabled: true,
    outputDir: './src/generated',
    outputFile: 'graphql.ts',
  },
});
```

2. Generate types:
```bash
npx flatbread codegen
```

3. Use in your app:
```ts
import type { Post, GetPostsQuery } from './generated/graphql';
```

### 🔮 Future Plans

- **gql.tada Integration**: Support for compile-time type inference
- **Custom Strategies**: Plugin system for alternative codegen approaches  
- **IDE Integration**: VS Code extension for seamless development experience
- **Performance Monitoring**: Built-in performance metrics and optimization suggestions