---
id: fnd-pmf-rubric-understates-shipped-validation-and-wa--p04gd8xfknwvz2pe
effort: eff-relational-content-foundation--8a8332x4cazgf2k0
title: PMF rubric understates shipped validation and watch behavior
kind: retrospective
created_at: '2026-07-19T01:30:56.615Z'
derives_from:
  - fnd-reference-integrity-is-roadmap-critical--2ss712xpmsfh77xf
  - fnd-unified-watch-loop-is-the-intended-runtime-contr--t9ghag8yqxgf3p5t
---

## Evidence

- `docs/pmf-decision-rubric.md` describes reliable content hot reload as not yet a pillar and treats ordinary content edits requiring a full restart as a no-go signal.
- `docs/local-dev-loop.md` documents `flatbread start --watch` as the supported unified path: valid content/config edits hot-swap the GraphQL schema without restarting the framework.
- `packages/flatbread/src/cli/index.ts` exposes `start --watch`, and live-server tests cover filesystem watch to schema hot-swap.
- The same rubric describes configured reference integrity as uneven and suggests silent query-time null chains, while `validateRecords` runs before schema generation and reports duplicate IDs, missing targets, and invalid reference shapes.

## Implication

A buyer-facing comparison page understates current behavior and conflicts with the retained product docs. Refresh its current-vs-target language; retain only documented limitations such as package-code rebuilds, framework-owned refresh, and prototype read-surface gaps.
