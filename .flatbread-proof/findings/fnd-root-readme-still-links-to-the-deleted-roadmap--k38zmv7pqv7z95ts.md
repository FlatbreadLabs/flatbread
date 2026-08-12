---
id: fnd-root-readme-still-links-to-the-deleted-roadmap--k38zmv7pqv7z95ts
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Root README still links to the deleted roadmap
kind: retrospective
created_at: '2026-07-19T01:30:05.841Z'
derives_from:
  - fnd-adrs-created-a-second-planning-authority--j1waeg8qh900sqee
invalidated_by:
  - fnd-root-readme-roadmap-reference-is-already-removed--w56t43aa10v311hj
---

## Evidence

`README.md` has a public "Roadmap" sentence linking to `docs/roadmap.md`. That file was intentionally removed when planning state moved into `.flatbread-efforts/`, so the repository-relative link is broken in a fresh clone and on GitHub.

## Implication

The main project entrypoint contradicts the new canonical planning location. Replace the stale roadmap copy with the bounded Effort Graph entrypoint or remove it from product-facing onboarding.
