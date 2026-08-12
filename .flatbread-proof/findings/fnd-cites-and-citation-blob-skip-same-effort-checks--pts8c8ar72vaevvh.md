---
id: fnd-cites-and-citation-blob-skip-same-effort-checks--pts8c8ar72vaevvh
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: >-
  cites and Citation.blob skip same-effort checks; Effort.cites is mostly
  unreachable
kind: measurement
created_at: '2026-07-24T07:44:00.313Z'
derives_from:
  - dec-ship-citation-collection-with-optional-blob--fyga3x876n7rcnmn
invalidated_by:
  - fnd-citation-and-blob-links-now-stay-within-one-effo--gkyd4dczafebk4fz
---

Planner validates cites/Citation.blob target kind only, unlike ResolveIssue/MitigateRisk/SetRiskState which enforce same effort. Cross-effort Citation/Blob links are writable. Read path silently drops foreign-effort cite targets in relations() with no anomaly. Separately, Effort records have no effort frontmatter field, so relations(effortId, effortId, [cites]) rejects the Effort as not in effort. CreateEffort.cites also chicken-eggs: Citations require an existing Effort, so same-effort CreateEffort.cites is unreachable via the mutation API.
