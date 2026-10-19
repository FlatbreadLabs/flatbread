---
id: fnd-explorer-has-no-revision-aware-change-model--bqpg99cfmx25f8fe
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Explorer has no revision-aware change model
kind: retrospective
created_at: '2026-08-25T08:08:23.538Z'
---

## Evidence

- `packages/explorer/src/web/presets/proof/useProofLive.ts` fetches one graph and replaces the current node and edge arrays after each accepted generation.
- `packages/explorer/src/web/presets/proof/types.ts` has no revision, source-span, or change-state fields.
- `packages/explorer/src/web/app/components/GraphCanvas.tsx` clears focus when a selected record leaves the live graph.

## Implication

Revision review needs an explicit snapshot, diff, and review-state model. It cannot be inferred from lifecycle state or the latest node array.
