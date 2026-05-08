# Example content

Central store for markdown and YAML used by **`examples/nextjs`** and other integrations. To avoid drift, **`examples/nextjs`** uses a symlink: **`examples/nextjs/content` → `../content`** (this directory).

## Layout for the primary onboarding story (posts · authors · tags)

```text
markdown/posts/    # Post collection — frontmatter: id, title, authors (ids), tags (string list), …
markdown/authors/  # Author collection — referenced from posts via Flatbread `refs`
yaml/             # Extra YAML-backed samples (e.g. YamlAuthor); secondary to markdown onboarding
```

- **Relations:** **`authors`** in post frontmatter lists **author ids** that match **`id`** in author files. Flatbread resolves them through **`refs: { authors: 'Author' }`** in **`flatbread.config.js`** relative to **`examples/nextjs`**.

- **Tags:** lists like **`tags: [cats, science]`** in post frontmatter are **string facets** on each **`Post`** (arrays of scalars through the schema). That is **not** the same as a **`refs`-backed **`Tag`** collection**; normalized tag files require an extra **`Tag`** collection and explicit **`refs`** in config.

Canonical commands and the full relational walkthrough live in the [root README quickstart](https://github.com/FlatbreadLabs/flatbread/blob/main/README.md#quickstart-posts-authors-and-tags).
