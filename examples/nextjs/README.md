# Flatbread Next.js example with TypeScript codegen

This example demonstrates the current canonical Flatbread onboarding path: file-backed collections and relations, a generated GraphQL schema, and generated TypeScript query/result types in a Next.js app.

## 🚀 Quick start

From the repository root:

```bash
pnpm install
pnpm build
cd examples/nextjs
npx flatbread codegen --verbose
npx flatbread start -- next dev --turbopack
```

Open `http://localhost:3000`. Flatbread serves GraphQL on `http://localhost:5057/graphql` while Next.js renders typed query results.

The `dev` package script uses `--https`, which may require local certificate setup. In headless environments, prefer the explicit `npx flatbread start -- next dev --turbopack` command above.

## 📁 Project Structure

- `flatbread.config.js` - Flatbread collection, relation, transformer, and codegen configuration
- `content` - symlink to the shared example content folder
- `generated/graphql.ts` - auto-generated TypeScript types
- `queries/posts.graphql` - GraphQL queries for type generation
- `lib/graphql.ts` - GraphQL client utilities
- `app/components/` - React components using generated types
- `app/page.tsx` - Main page displaying content

## 🏗️ Generated Types

The example uses `@flatbread/codegen` to automatically generate TypeScript types from your Flatbread GraphQL schema. Types are generated based on:

1. **GraphQL Schema** - Generated from your Flatbread configuration
2. **GraphQL Documents** - Queries defined in `queries/`

### Regenerating Types

When you change your Flatbread configuration or GraphQL queries, regenerate types:

```bash
npx flatbread codegen --verbose
```

### Watching for Changes

For development, you can watch for changes and auto-regenerate:

```bash
npx flatbread codegen --watch --verbose
```

## 🎯 Features Demonstrated

- ✅ **Type-Safe GraphQL Queries** - Using generated TypeScript types
- ✅ **Intelligent Caching** - Avoids regeneration when config unchanged
- ✅ **Component Composition** - React components with proper typing
- ✅ **Server-Side Rendering** - Next.js App Router with async data fetching
- ✅ **Error Handling** - Graceful fallbacks for data loading errors

## 📝 GraphQL Queries

Example queries in `queries/posts.graphql`:

- `GetPostCategories` - Fetch all post categories with authors and images
- `GetAllPosts` - Fetch all posts with basic information
- `GetAuthors` - Fetch all authors with skills and images

## 🔧 Configuration

### Flatbread Config (`flatbread.config.js`)

Standard Flatbread configuration with content sources and transformers.

### Codegen Config

You can customize codegen behavior in your `flatbread.config.js`:

```javascript
export default defineConfig({
  // ... your existing config
  codegen: {
    enabled: true,
    outputDir: './generated',
    outputFile: 'graphql.ts',
    documents: ['./**/*.graphql'],
    watch: false,
    cache: true,
  },
});
```

## 🎨 Styling

This example uses Tailwind CSS for styling, similar to the SvelteKit example. The layout features:

- **Split Pane Layout** - JSON output on left, rendered UI on right
- **PostCard Components** - Displays posts with authors, ratings, and content
- **Responsive Design** - Works on different screen sizes

## 🚫 Troubleshooting

### "No posts found"
Make sure the Flatbread server is running on `http://localhost:5057`:
```bash
npx flatbread start -- next dev --turbopack
```

### TypeScript Errors
Regenerate types if your schema changed:
```bash
npx flatbread codegen --clear-cache --verbose
```

### Network Errors
Check that your GraphQL endpoint is accessible and CORS is configured properly.

## 📚 Learn More

- [Flatbread Documentation](https://github.com/FlatbreadLabs/flatbread)
- [GraphQL Code Generator](https://www.the-guild.dev/graphql/codegen)
- [Next.js Documentation](https://nextjs.org/docs)