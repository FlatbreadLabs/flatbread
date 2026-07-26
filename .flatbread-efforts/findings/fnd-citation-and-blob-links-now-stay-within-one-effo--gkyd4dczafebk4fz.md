---
id: fnd-citation-and-blob-links-now-stay-within-one-effo--gkyd4dczafebk4fz
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Citation and Blob links now stay within one Effort
kind: retrospective
created_at: '2026-07-26T02:38:53.500Z'
invalidates:
  - fnd-cites-and-citation-blob-skip-same-effort-checks--pts8c8ar72vaevvh
invalidated_by:
  - fnd-citation-and-blob-records-now-match-the-current--p6c37v29mx4jjfr2
---

The Citation and Blob implementation now rejects cross-Effort `cites` and `Citation.blob` links. `CreateEffort` rejects `cites`, and relation reads accept an Effort as their own root record. This Finding replaces the earlier report of missing validation.
