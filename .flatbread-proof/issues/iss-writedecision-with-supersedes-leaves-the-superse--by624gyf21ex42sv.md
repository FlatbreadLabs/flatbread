---
id: iss-writedecision-with-supersedes-leaves-the-superse--by624gyf21ex42sv
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: WriteDecision with supersedes leaves the superseded Decision in state accepted
kind: defect
status: open
created_at: '2026-07-26T05:07:15.240Z'
derives_from:
  - fnd-supersession-transitions-decision-state-on-the-r--2m807tcfjz2jz9gt
---

## Problem

Creating a Decision with an inline `supersedes` edge appends the `superseded_by` reverse projection to the target but leaves its `state` untouched, so a replaced Decision keeps reporting `state: accepted`. The `Supersede` retro-link mutation on the same target does set `state: superseded`. Same semantic act, two different outcomes depending on which mutation got there first.

## Fix sketch

In the create-path forward-edge loop in `packages/effort-graph/src/planner.ts`, when `edge === 'supersedes'` and the target is a Decision, compose `supersedeDecisionLifecycle(snapshot, target.id).nextFrontmatter` before appending the back-pointer — the same composition the `Supersede` branch already performs. Add a planner test mirroring the existing retro-link supersession test but driven through `WriteDecision`, since the current create-path test only covers Findings and so cannot catch this.

## Repair

Two records in this repo already carry the bad shape (`dec-brand-the-agent-memory-surface-as-crumb-graph--fvskcvagx3a7sybe`, `dec-brand-the-agent-memory-surface-as-crumb-trail--tngncepdbwjkh9jc`). Repair them through the reindexer rather than by hand-editing frontmatter.

## Scope note

Consumers should keep deriving supersession from edges regardless of the fix: forward edges are the authoritative representation, and edge-derived state also covers legacy and hand-edited records. `examples/effort-viz/lib/lifecycle.ts` does this and should not be reverted once the writer is corrected.
