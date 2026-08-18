# Experiment: Issue #162 — relational starter benchmark

## Question

Can a developer start from Flatbread's canonical existing example, understand
the `posts → authors + tags` model, and reach a typed read result in under 10
minutes?

## Benchmark path

This uses the repo's canonical onboarding route on the existing example:

1. Read the root README quickstart:
   [`packages/flatbread/README.md#quickstart-posts-authors-and-tags`](../../../../../packages/flatbread/README.md#quickstart-posts-authors-and-tags).
2. Inspect the backing files:
   - `examples/content/markdown/posts/example-post.md`
   - `examples/content/markdown/authors/tony.md`
   - `examples/content/markdown/authors/eva.md`
3. Inspect the relation config:
   `examples/nextjs/flatbread.config.js`
4. Generate typed artifacts from the example directory:
   `cd examples/nextjs && pnpm exec flatbread codegen --clear-cache --verbose`
5. Confirm the typed read surface:
   - GraphQL operation types in `examples/nextjs/generated/graphql.ts`
   - generated read API usage in `examples/nextjs/lib/read.ts`
6. Verify the generated TypeScript read API path:
   `pnpm --filter nextjs build`
7. Optional raw query watch proof:
   `pnpm --filter nextjs run demo:watch-query`

## Fresh-worktree run

Environment: detached Git worktree created from the current branch with empty
workspace `node_modules` (pnpm reused the global package store).

Command:

```bash
git worktree add --detach /tmp/flatbread-starter-benchmark-worktree HEAD
cd /tmp/flatbread-starter-benchmark-worktree
start=$(date +%s)
corepack enable
pnpm install
pnpm build
cd examples/nextjs
pnpm exec flatbread codegen --clear-cache --verbose
timeout 8s pnpm run demo:watch-query
end=$(date +%s)
echo "elapsed_seconds=$((end-start))"
```

Observed result:

```text
elapsed_seconds=49
Done in 27.2s using pnpm v10.33.0
✓ Generated TypeScript types: /tmp/flatbread-starter-benchmark-worktree/examples/nextjs/generated/graphql.ts
```

Relevant first-query output before the watcher timeout:

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

The watcher is intentionally long-running, so the shell command used
`timeout 8s`; the first render completed before timeout and no GraphQL `errors`
field was present.

This completes the canonical install → build → codegen → first demo query path
on the existing example in under 10 minutes.

## Generated TypeScript read API verification

The Next.js home page imports `getPostsAuthorsAndTagsViaReadApi()` and
`getAuthorsViaReadApi()` from `examples/nextjs/lib/read.ts`. Static generation
therefore exercises the generated TypeScript read API path.

Command:

```bash
start=$(date +%s)
pnpm --filter nextjs build
end=$(date +%s)
echo "elapsed_seconds=$((end-start))"
```

Observed result:

```text
elapsed_seconds=18
✓ Compiled successfully in 3.0s
✓ Generating static pages (5/5)
Flatbread is done for now. Bye bye! 🥪
```

The build still emits the known `eslint-plugin-react-hooks` warning, but exits
0 and renders the page path that calls the generated read API.

## Warm-workspace rehearsal

Environment: existing cloud workspace with dependencies already present. This
is a **canonical-command rehearsal**, not a true empty-cache/fresh-clone
measurement.

Command:

```bash
start=$(date +%s)
pnpm install
pnpm build
cd examples/nextjs
pnpm exec flatbread codegen --clear-cache --verbose
timeout 8s pnpm run demo:watch-query
end=$(date +%s)
echo "elapsed_seconds=$((end-start))"
```

Observed result:

```text
elapsed_seconds=23
Done in 1.9s using pnpm v10.33.0
✓ Generated TypeScript types: /workspace/examples/nextjs/generated/graphql.ts
✓ TypeScript types generated successfully
"title": "The Art of Measuring Cats in Fruit Units"
"name": "Dr. Maya Espresso"
```

This is well under 10 minutes for the canonical command rehearsal in this
workspace. The fresh-worktree run above is the primary timing evidence; this
warm run remains useful for comparing maintainer-loop overhead.

The docs now place the relation model before GraphQL, so the cognitive steps
are:

- `Post` files carry `authors` IDs and `tags` string facets.
- `Author` files carry matching IDs.
- `flatbread.config.js` declares `refs: { authors: 'Author' }`.
- Codegen emits GraphQL operation types and Flatbread content-model/read helper
  types.

## Friction observed

- The fresh-worktree benchmark reused the global pnpm store, so it is not a
  network-cold install.
- `pnpm --filter nextjs build` succeeds and exercises the generated read API
  path, but still prints a known
  `eslint-plugin-react-hooks` load warning from the Next.js ESLint stack.
- `flatbread codegen --watch` is watch-only; docs must keep steering one-shot
  benchmark users to `flatbread codegen --verbose`.
- The generated TypeScript read API is still a prototype and executes through
  GraphQL, so the current first typed read result is strongest when described
  as "GraphQL operations plus generated read helpers over one content model."

## Follow-up issue drafts

### Follow-up: Network-cold benchmark on a fresh clone/container

**Problem:** This benchmark used a fresh worktree but reused the global pnpm
store.

**Acceptance criteria:**

- Run from a fresh clone/container with empty `node_modules` and cold pnpm
  store/cache.
- Record install, build, codegen, and first query time separately.
- Note native dependency install warnings and remediation steps.

### Follow-up: Turn friction notes into tracked issues

**Problem:** This report can draft follow-up work, but the current automation
cannot create/close GitHub issues.

**Acceptance criteria:**

- Create project notes or issues for the cold-start benchmark and Next.js ESLint
  warning.
- Link those issue URLs back into this report.

This report is the current project note until GitHub-side follow-ups can be
created by a maintainer.

### Follow-up: Clean Next.js ESLint dependency warning

**Problem:** `pnpm --filter nextjs build` exits 0 but reports a missing
`eslint-plugin-react-hooks` plugin.

**Acceptance criteria:**

- Add or reconcile the missing plugin dependency.
- `pnpm --filter nextjs build` runs without the plugin warning.

## Decision

**Iterate / keep.** The canonical starter path on the existing example now
makes the relation-first value legible and reaches typed output, generated
TypeScript read API execution, and a demo query result comfortably under the
10-minute target in a fresh worktree / warm-store environment. This should be
described as time-to-first-query on the canonical example, not time-to-model
from zero. A stricter network-cold benchmark should still be run before using
the timing as external marketing evidence.
