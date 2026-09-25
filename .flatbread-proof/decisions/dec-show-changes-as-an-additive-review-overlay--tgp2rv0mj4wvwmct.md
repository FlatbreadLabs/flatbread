---
id: dec-show-changes-as-an-additive-review-overlay--tgp2rv0mj4wvwmct
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Show changes as an additive review overlay
state: accepted
created_at: '2026-08-25T08:08:35.603Z'
derives_from:
  - con-change-review-stays-additive-and-read-only--p7h7wrvwf3s10ykm
  - dec-compare-complete-versioned-graph-snapshots--027nken1pmrw9byv
  - iss-explorer-cannot-review-changes-across-revisions--q4s8qjapczttpa9y
---

## Decision

Mark a node Changed when its normalized content differs. Mark an added, removed, or modified relation Changed. Mark an otherwise unchanged endpoint of a changed relation Affected. Keep Changed and Affected as distinct labels. Keep removed records as selectable ghosts that show their base values.

Frame the changed subgraph once when review opens. After that, camera and selection remain user-owned. New live changes enter a review rail and never move the camera. Keep the full graph selectable. Drawers open on the semantic diff and offer Base and Head views.

## Consequences

Review focus stays clear without turning the Explorer into a locked filtered graph. Large change sets need rail grouping and deterministic ordering, but they do not change navigation rules.
