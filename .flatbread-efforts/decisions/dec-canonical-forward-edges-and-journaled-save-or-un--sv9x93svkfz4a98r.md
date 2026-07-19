---
id: dec-canonical-forward-edges-and-journaled-save-or-un--sv9x93svkfz4a98r
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Canonical forward edges and journaled save-or-undo
state: accepted
created_at: '2026-07-18T19:42:42.756Z'
derives_from:
  - dec-use-semantic-mutations-and-a-standalone-writer--2d0m3tkqhad4yyhr
---

## Context

Records need to answer “am I current?” from a single file, but treating both
directions of `supersedes` and `invalidates` as authoritative creates needless
two-file conflicts. Some lifecycle operations are still irreducibly
multi-record, such as accepting one Decision and rejecting competing proposed
siblings.

## Decision

Forward `supersedes` and `invalidates` edges are authoritative. Their reverse
edges are derived, materialized projections: the writer writes both sides,
and the reindexer repairs drift after hand edits, merge damage, or recovery.

Use a writer-level save-or-undo journal as the correctness boundary. It records
intent and before-images durably, writes each target through a same-directory
temporary file and rename, marks the transaction committed, then runs one
journal-aware reindex batch. Publish a generation only after projection repair
and the schema swap succeed. Serialize concurrent writers with a per-graph
lock. Git history is opt-in and follows, never determines, semantic commit.

## Alternatives considered

- **Bidirectional authoritative edges:** rejected because reverse-only edits
  cannot establish intent and make every edge update an authoritative
  two-file transaction.
- **Git commit as the transaction boundary:** rejected because it touches
  contributor history, complicates rebases, and cannot be correctness
  infrastructure. Deliberate session checkpoints remain possible.

## Consequences

Raw disk readers may briefly see an in-progress rename and materialized
projections may be stale until repair; indexed reads never observe a partial
committed mutation. Merge repair reconciles forward edges then regenerates
reverse projections. Reversal requires evidence that raw-file readers need
atomic cross-file visibility or that per-mutation commits remain low-friction
in real concurrent workflows.
