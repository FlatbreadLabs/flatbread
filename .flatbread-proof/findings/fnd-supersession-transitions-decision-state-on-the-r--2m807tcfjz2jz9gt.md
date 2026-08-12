---
id: fnd-supersession-transitions-decision-state-on-the-r--2m807tcfjz2jz9gt
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: >-
  Supersession transitions Decision state on the retro-link path but not on
  create
kind: survey
created_at: '2026-07-26T05:06:57.371Z'
---

## Observation

`packages/effort-graph/src/planner.ts` has two code paths that create a `supersedes` edge, and they disagree about whether the superseded Decision changes state.

- **Retro-link (`Supersede` mutation), planner.ts ~195-215.** When the target is a Decision it composes `supersedeDecisionLifecycle(snapshot, b.id).nextFrontmatter`, which sets `state: 'superseded'`, then appends the `superseded_by` back-pointer.
- **Inline on create (`WriteDecision` with `supersedes: [...]`), planner.ts ~127-160.** The generic forward-edge loop only appends the `superseded_by` reverse projection. It never consults `supersedeDecisionLifecycle` and never touches `state`.

## Evidence

Two records in this repo's own graph show the create-path outcome — both carry `superseded_by` while still reporting `state: accepted`:

- `dec-brand-the-agent-memory-surface-as-crumb-graph--fvskcvagx3a7sybe`
- `dec-brand-the-agent-memory-surface-as-crumb-trail--tngncepdbwjkh9jc`

`DecisionFrontmatterSchema` in `schemas.ts` already admits `'superseded'`, and `decision-lifecycle.ts` exists to produce it, so this is an inconsistency between the two paths rather than a deliberate modelling choice.

The blind spot is a test gap: the planner suite covers the create path with `supersedes` only for Findings, which have no state field, so the Decision case is unexercised.

## Why it matters beyond cosmetics

- `planner.ts` gates `MitigateRisk` on `state !== 'accepted'`, so a superseded Decision can currently mitigate a Risk.
- `flatbread effort records --state accepted` returns retired Decisions.
- Consumers reading `state` directly label retired reasoning as committed. `examples/effort-viz` now carries a dedicated module (`lib/lifecycle.ts`) that derives effective lifecycle from edges specifically to work around this.
