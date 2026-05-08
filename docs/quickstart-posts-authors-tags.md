# Quickstart: posts, authors, and categories

This is the canonical first-success path for Flatbread. It starts from a relation model, then shows the current GraphQL interface and generated TypeScript result types that come from that model.

## 1. Start from the relation model

The Next.js example uses repository-local files as the source of truth:

```text
examples/nextjs/content/
├─ markdown/authors/
├─ markdown/posts/
└─ yaml/authors/
```

The core model is:

- `Post` records are Markdown files in `content/markdown/posts`.
- `Author` records are Markdown files in `content/markdown/authors`.
- `PostCategory` records are category/slug Markdown files under `content/markdown/posts/[category]/[slug].md`.
- `Post.authors` and `PostCategory.authors` are relations to `Author` records.

## 2. Run the example

From the repository root:

```bash
pnpm install
pnpm build
cd examples/nextjs
npx flatbread codegen --verbose
npx flatbread start -- next dev --turbopack
```

Open `http://localhost:3000`.

## 3. See where the relation model is declared

`examples/nextjs/flatbread.config.js` declares the collections and relations:

```js
export default defineConfig({
  source: sourceFilesystem(),
  transformer: [transformerMarkdown(transformerConfig), transformerYaml()],
  content: [
    {
      path: 'content/markdown/posts',
      collection: 'Post',
      refs: { authors: 'Author' },
    },
    {
      path: 'content/markdown/posts/[category]/[slug].md',
      collection: 'PostCategory',
      refs: { authors: 'Author' },
    },
    {
      path: 'content/markdown/authors',
      collection: 'Author',
    },
  ],
});
```

This config is the product concept: files become records in collections, and `refs` describe relations between records.

## 4. Generate typed query results

The current query interface is GraphQL, and `npx flatbread codegen --verbose` turns query documents into TypeScript types in `examples/nextjs/generated/graphql.ts`.

For example, `examples/nextjs/queries/posts.graphql` asks for posts and their authors:

```graphql
query GetAllPosts {
  allPosts {
    id
    title
    authors {
      id
      name
    }
  }
}
```

The generated `GetAllPostsQuery` type gives the app typed result data:

```ts
import type { GetAllPostsQuery } from './generated/graphql';

function renderPostTitles(data: GetAllPostsQuery) {
  return data.allPosts
    ?.map((post) => {
      const authors = post?.authors?.map((author) => author?.name).join(', ');
      return `${post?.title} by ${authors}`;
    })
    .filter(Boolean);
}
```

The app uses the same pattern with `PostCategory` and `Author` types in `app/page.tsx` and `app/components/BlogIndex.tsx`.

## 5. Where GraphQL fits

GraphQL is the current generated interface over the model:

- Flatbread reads files and builds collections/relations.
- The GraphQL schema exposes those collections and relations for queries.
- GraphQL Code Generator produces TypeScript result types.

Future generated TypeScript read APIs should preserve the same model and let users query without writing GraphQL documents. Until then, GraphQL is the supported interface, not the product identity.

## 6. Current restart boundary

Content hot reload is not yet supported. If you edit content, config, or query documents:

1. stop the Flatbread/Next process,
2. rerun `npx flatbread codegen --verbose` when query or schema shape changes, and
3. restart `npx flatbread start -- next dev --turbopack`.
