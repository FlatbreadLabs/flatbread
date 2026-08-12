---
id: fnd-root-readme-roadmap-reference-is-already-removed--w56t43aa10v311hj
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Root README roadmap reference is already removed
kind: retrospective
created_at: '2026-07-19T01:31:20.259Z'
invalidates:
  - fnd-root-readme-still-links-to-the-deleted-roadmap--k38zmv7pqv7z95ts
---

## Correction

The prior audit finding was based on a stale read of the root symlink. `README.md` resolves to `packages/flatbread/README.md`; the current working-tree version has already replaced the old `docs/roadmap.md` link with the Effort Graph planning section.

The previous finding is therefore invalid for this worktree. Separate relative-link-base concerns in the symlinked README remain an audit item.
