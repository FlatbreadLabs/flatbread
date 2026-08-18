---
id: fnd-building-the-docs-site-on-flatbread-found-six-li--tabacz23jq6jk545
effort: eff-relational-content-foundation--8a8332x4cazgf2k0
title: Building the docs site on Flatbread found six limits in the content model
kind: retrospective
created_at: '2026-08-12T23:05:00.464Z'
---

The docs site at `apps/docs` renders the repository's own guides and package READMEs through Flatbread. Getting it working surfaced six limits. Each has a workaround in the site today, so none of them blocks; they are ranked by how much they cost a newcomer.

**1. A content path may not climb above the project directory.** `path: '../../packages/[id]/README.md'` matched nothing and produced a `Package` type with only `_collection` on it. No error said why. The site keeps symlinks in `content/reference/` instead.

**2. A capture that names a directory followed by a fixed filename is not matched on the initial load.** `packages/[id]/README.md` is the natural way to say "one README per package". `gatherFileNodes` splits the path on `/[`, treats `id]/README.md` as one branch, and computes a filename-stripping length that yields an empty capture, so every candidate is then dropped by the extension filter. `matchPath`, which watch mode uses, handles the same pattern. Initial load and watch therefore disagree about which paths are valid.

**3. There is no heading extraction, so a contents list needs a plugin.** The markdown transformer returns `raw`, `html`, `excerpt`, and `timeToRead` and nothing structural. The site adds ids with its own rehype plugin and reads them back out of the HTML string with a regex.

**4. There is no ranked search.** `filter` can match with `regex` and `wildcard` but cannot rank. The site flattens every page into a list at build time and scores it in the browser.

**5. `sortBy` reads top-level keys only.** Navigation cannot sort through the `section` ref, so every page carries its own `order` number.

**6. Every generated field is nullable.** A field only exists in the schema if some record carries it, so `AllDocsQuery` returns `id?: string | null` for a field that is required and validated. Each reader in `lib/content.ts` narrows once so pages can rely on plain values.

What worked without argument: refs (including a self-referencing `related` on `Doc`), path captures supplying `id` with no frontmatter, markdown and YAML transformers side by side, remark and rehype plugin hooks, `flatbread codegen`, and `flatbread start -- next build` holding the server open for exactly the length of a production build.
