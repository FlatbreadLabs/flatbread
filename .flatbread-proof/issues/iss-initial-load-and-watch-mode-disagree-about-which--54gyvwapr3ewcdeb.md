---
id: iss-initial-load-and-watch-mode-disagree-about-which--54gyvwapr3ewcdeb
effort: eff-relational-content-foundation--8a8332x4cazgf2k0
title: Initial load and watch mode disagree about which capture patterns are valid
kind: defect
status: open
created_at: '2026-08-12T23:05:17.703Z'
derives_from:
  - fnd-building-the-docs-site-on-flatbread-found-six-li--tabacz23jq6jk545
---

`gatherFileNodes` (initial load) and `matchPath` (watch mode) are separate implementations, and they accept different patterns. `content/packages/[id]/README.md` — a captured directory followed by a fixed filename — works in `matchPath` and matches nothing in `gatherFileNodes`.

The cause is in `packages/source-filesystem/src/utils/gatherFileNodes.ts`. The path is split on `/\[`, so `[id]/README.md` arrives as the single branch `id]/README.md`. The code reads the capture name up to `]` and treats everything after it as a suffix to strip from the matched name, giving `remove: 10`. Applied to a directory called `core`, `name.slice(0, 4 - 10)` is the empty string, and the extension filter then drops the directory because it has no `.md` on the end.

Two effects. A user gets an empty collection with no error — the GraphQL type is generated with only `_collection` on it, which reads as though the collection has no fields rather than no records. And a config that works under `flatbread start --watch` can fail under `flatbread start -- next build`, which is the worst possible place to find out.

Worth fixing together: an empty collection should say so. `apps/docs` hit both halves of this and worked around them with symlinks named after the id.
