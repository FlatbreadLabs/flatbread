---
id: dec-keep-review-progress-private-and-explicit--gnanzqbpkvdwk1pv
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Keep review progress private and explicit
state: accepted
created_at: '2026-08-25T08:08:40.442Z'
derives_from:
  - con-change-review-stays-additive-and-read-only--p7h7wrvwf3s10ykm
  - dec-compare-complete-versioned-graph-snapshots--027nken1pmrw9byv
  - iss-explorer-cannot-review-changes-across-revisions--q4s8qjapczttpa9y
---

## Context

Graph lifecycle state is shared project knowledge. Review progress is personal and depends on which comparison a user has seen.

## Decision

Store Seen and Reviewed per user outside Proof. Mark Seen automatically when the user opens a change. Mark Reviewed only through an explicit action. Key progress to a change fingerprint, so a later change creates a new pending item without erasing earlier history.

Support two scopes: PR changes compares the selected base and head; Since your review compares the current head with the user’s last reviewed snapshot. New live snapshots add pending changes without moving the graph.

## Consequences

V1 never writes personal state into the shared graph. A separate store may later synchronize progress across browsers, but the snapshot and diff contract does not depend on that store.
