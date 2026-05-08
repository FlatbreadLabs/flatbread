# Edit file → see query update demo

This is a single-process demo harness, not the long-running `flatbread start`
server. Production live-editing still requires the unified watch design
described in [local-dev-loop.md](./local-dev-loop.md).

This demo is the current reproducible path for issue #158. It proves the core
edit/query loop for the canonical **posts → authors + tags** model without
requiring a manual process restart in this focused demo path.

The full `flatbread start` GraphQL server still builds its schema at startup
(see [local dev loop boundaries](./local-dev-loop.md)). This demo therefore
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
- ⚠️ The long-running `flatbread start` server still needs restart for content
  and schema changes today.
- ⚠️ The watcher script is a demo harness, not the final `flatbread start --watch` implementation described in [local-dev-loop.md](./local-dev-loop.md).
