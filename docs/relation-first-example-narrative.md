# Relation-first example narrative

Flatbread examples should teach the relation model before the transport. The first story is not "write a GraphQL query"; it is "model content records and references in files, then choose a query interface."

## Backing files

The canonical example uses posts, authors, and categories:

```text
content/
├─ markdown/
│  ├─ authors/
│  │  ├─ tony.md
│  │  └─ eva.md
│  └─ posts/
│     ├─ example-post.md
│     └─ food/perfect-toast.md
└─ yaml/
   └─ authors/
```

Each file is still plain content in Git. A developer can review a pull request, diff a content change, or move the data out of Flatbread without a hosted service.

## Content model

The config turns those paths into collections:

| Collection     | Backing files                                 | Role                      |
| -------------- | --------------------------------------------- | ------------------------- |
| `Post`         | `content/markdown/posts`                      | Main article records.     |
| `Author`       | `content/markdown/authors`                    | People linked from posts. |
| `PostCategory` | `content/markdown/posts/[category]/[slug].md` | Category-aware post view. |

Relations are declared with `refs`:

```js
refs: {
  authors: 'Author';
}
```

That means a post's `authors` field contains one or more author IDs, and Flatbread exposes the linked author records through the generated interface.

## Generated schema/API

Today Flatbread generates a GraphQL schema. In product language, that schema is an adapter over the content model:

- collection names become query fields such as `allPosts` and `allAuthors`,
- record fields become typed query fields,
- relation fields can expand into linked records, and
- generated TypeScript types mirror the selected query result shape.

Future TypeScript read APIs should use the same collection, record, ID, relation, cardinality, and validation semantics.

## Query result

A relation-first query should visibly show content and linked records from the same model:

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

Representative result:

```json
{
  "allPosts": [
    {
      "id": "example-post",
      "title": "Example Post",
      "authors": [
        {
          "id": "tony",
          "name": "Tony"
        }
      ]
    }
  ]
}
```

The important point is that `authors` is not hand-joined in app code. It is a declared relation in the Flatbread model.

## Documentation rule

When adding or editing examples:

1. name the collections first,
2. show the source files,
3. explain the `refs`,
4. show the generated query/API result, and
5. only then explain GraphQL-specific mechanics such as documents, endpoints, Apollo Studio, or GraphQL Code Generator.
