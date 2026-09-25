---
id: dec-compare-complete-versioned-graph-snapshots--027nken1pmrw9byv
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Compare complete versioned graph snapshots
state: accepted
created_at: '2026-08-25T08:08:30.713Z'
derives_from:
  - con-change-review-stays-additive-and-read-only--p7h7wrvwf3s10ykm
  - dec-bridge-committed-generations-into-live-reads--mc3728t4w1kyqcqq
  - dec-canonical-forward-edges-and-journaled-save-or-un--sv9x93svkfz4a98r
  - dec-ship-citation-collection-with-optional-blob--fyga3x876n7rcnmn
  - fnd-explorer-has-no-revision-aware-change-model--bqpg99cfmx25f8fe
  - iss-explorer-cannot-review-changes-across-revisions--q4s8qjapczttpa9y
---

## Context

The current feed exposes only the latest graph. Partial patches make reconnect and ordering behavior depend on missed events, and text diffs cannot distinguish graph meaning from Markdown layout.

## Decision

Define one host-neutral source-session JSON contract for static, paired, and live sources. Each complete snapshot names its source and revision and contains normalized nodes, relations, and source anchors. A pair identifies base and head. A live publisher sends a complete snapshot for every accepted revision; it does not send partial patches.

Compute changes semantically by stable record IDs, normalized field values, and authored relations. Preserve exact spans for each record, frontmatter field, body, and authored relation. The canonical forward relation owns the authored span; derived reverse relations point to that change. Render Citation records as nodes and Blob records as attachments.

## Consequences

The Explorer can recompute the same diff after reconnect and can use one client model for stored comparisons and live work. Snapshot payloads are larger than patches. Revisit patch transport only if measured snapshot cost becomes a limit while complete-state recovery remains deterministic.
