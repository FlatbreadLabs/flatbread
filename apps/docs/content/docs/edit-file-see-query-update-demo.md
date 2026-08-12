---
id: edit-file-see-query-update-demo
title: Edit a file, watch the query change
section: guides
order: 2
summary: A single-process harness that proves the loop from a saved file to a changed query result.
related:
  - local-dev-loop
---

# Edit file → see query update demo

This is a single-process demo harness, not the long-running `flatbread start`
server. Production live-editing uses the unified watch path described in
[local-dev-loop.md](./local-dev-loop.md).

This demo is the current reproducible path for issue #158. It shows the
edit/query loop for posts, authors, and tags without requiring a manual
restart.

One-shot `flatbread start` builds its schema at startup; use
`flatbread start --watch` for live content/config updates (see
[local dev loop boundaries](./local-dev-loop.md)). This demo therefore
uses a tiny watcher script that rebuilds the Flatbread schema per file event
and executes the same posts/authors/tags query shape the generated TypeScript
read API uses in the Next.js example.

## Run it from a clean checkout

```bash
pnpm install
pnpm build
cd examples/nextjs
pnpm exec flatbread codegen --verbose
pnpm run demo:watch-query
```

The script watches both Markdown and YAML relation data:

```text
examples/content/markdown/posts/example-post.md
examples/content/yaml/authors/dr-caffeine.yml
```

It prints JSON like:

```json
{
  "data": {
    "allPosts": [
      {
        "id": "sdfsdf-23423-sdfsd-23444-dfghf",
        "title": "The Art of Measuring Cats in Fruit Units",
        "tags": ["cats", "measurements", "fruit-science", "important-research"],
        "authors": [
          { "id": "40s3", "name": "Eva" },
          { "id": "2a3e", "name": "Tony" }
        ]
      }
    ],
    "allYamlAuthors": [
      {
        "id": "caffeine-researcher",
        "name": "Dr. Maya Espresso",
        "friend": { "id": "2a3e", "name": "Tony" }
      }
    ]
  }
}
```

## Try the edit

In another terminal, edit the watched Markdown post title plus a YAML author
name and `friend` relation:

```bash
pnpm --filter nextjs run demo:edit
```

The watcher prints fresh query results with the edited Markdown title, edited
YAML author name, and changed YAML `friend` relation. Restore the files after
the demo:

```bash
pnpm --filter nextjs run demo:restore
```

## What this does and does not prove

- ✅ Editing relation-backed Markdown and YAML updates the query result without
  a manual restart in this demo path.
- ✅ The query includes post fields, tag facets, resolved Markdown author
  records, and resolved YAML author records.
- ✅ The demo is reproducible from the monorepo root with pnpm commands.
- ⚠️ The demo watcher is a focused harness, not a replacement for the unified
  `flatbread start --watch` path.
