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

**Next action: start the demo with the five steps below.**

Allow 5–10 minutes from a clean checkout. If dependencies and packages are
already built, allow about 1 minute.

## Run it from a clean checkout

1. From the repository root, install dependencies:

   ```bash
   pnpm install
   ```

2. Build the workspace packages:

   ```bash
   pnpm build
   ```

3. Enter the example app:

   ```bash
   cd examples/nextjs
   ```

4. Generate the initial TypeScript artifacts:

   ```bash
   pnpm exec flatbread codegen --verbose
   ```

5. Start the demo watcher:

   ```bash
   pnpm run demo:watch-query
   ```

Success: the terminal prints one JSON result and waits for file changes.

The script watches both Markdown and YAML relation data:

```text
examples/content/markdown/posts/example-post.md
examples/content/yaml/authors/dr-caffeine.yml
```

The first result looks like this:

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

Open another terminal at the repository root. These four steps take about 1
minute.

1. Apply the sample edit:

   ```bash
   pnpm --filter nextjs run demo:edit
   ```

2. Check the watcher terminal for a new post title, YAML author name, and YAML
   `friend` relation.

3. Restore the sample files:

   ```bash
   pnpm --filter nextjs run demo:restore
   ```

4. Verify that both watched files match the checkout:

   ```bash
   git diff --exit-code -- examples/content/markdown/posts/example-post.md examples/content/yaml/authors/dr-caffeine.yml
   ```

   No output means the files are restored. A diff means the demo edit or an
   earlier local change remains.

If no second result appears, the watcher is not running. Return to step 5 and
start it before applying the edit again.

This single-process harness rebuilds the Flatbread schema for each watched file
event. It then runs the posts, authors, and tags query shape used by the
generated TypeScript read API. Production live editing uses the unified watch
path in the [local dev loop guide](./local-dev-loop.md).

## What this does and does not prove

- ✅ Editing relation-backed Markdown and YAML updates the query result without
  a manual restart in this demo path.
- ✅ The query includes post fields, tag facets, resolved Markdown author
  records, and resolved YAML author records.
- ✅ The demo is reproducible from the monorepo root with pnpm commands.
- ⚠️ The demo watcher is a focused harness, not a replacement for the unified
  `flatbread start --watch` path.

Next: run the verification command in step 4 before you leave the checkout.
