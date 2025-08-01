# Flatbread Next.js Example with TypeScript Codegen

This example demonstrates how to use Flatbread with Next.js and automatic TypeScript type generation.

## 🚀 Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Generate TypeScript types from GraphQL schema:**
   ```bash
   npx flatbread codegen --documents "src/queries/**/*.graphql" --verbose
   ```

3. **Start the Flatbread server:**
   ```bash
   npx flatbread dev
   ```

4. **In another terminal, start the Next.js development server:**
   ```bash
   npm run dev
   ```

5. **Open your browser to** `http://localhost:3000`

## 📁 Project Structure

- `flatbread.config.js` - Flatbread configuration
- `src/generated/graphql.ts` - Auto-generated TypeScript types
- `src/queries/posts.graphql` - GraphQL queries for type generation
- `src/lib/graphql.ts` - GraphQL client utilities
- `src/components/` - React components using generated types
- `app/page.tsx` - Main page displaying content

## 🏗️ Generated Types

The example uses `@flatbread/codegen` to automatically generate TypeScript types from your Flatbread GraphQL schema. Types are generated based on:

1. **GraphQL Schema** - Generated from your Flatbread configuration
2. **GraphQL Documents** - Queries defined in `src/queries/`

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

Example queries in `src/queries/posts.graphql`:

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
    outputDir: './src/generated',
    outputFile: 'graphql.ts',
    documents: ['src/queries/**/*.graphql'],
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
npx flatbread dev
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