---
id: fnd-citation-and-blob-records-now-match-the-current--p6c37v29mx4jjfr2
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Citation and Blob records now match the current model
kind: retrospective
created_at: '2026-07-26T02:49:33.761Z'
invalidates:
  - fnd-accepted-decisions-disagree-on-how-blobs-are-cit--z9s360sgahmtjz7h
  - fnd-citation-and-blob-links-now-stay-within-one-effo--gkyd4dczafebk4fz
  - fnd-skill-and-hard-constraint-still-teach-13-mutatio--gvg2btns0q7rp0eq
---

The skills and related Decision, Issue, and Constraint now describe eight record types, fifteen mutations, and the Citation-to-optional-Blob path. Direct Blob citations are not supported. Cross-Effort `cites` and `Citation.blob` links are rejected. `CreateEffort` rejects `cites` through the CLI, mutation schema, planner, and writer, so callers cannot silently attach citations while creating an Effort. This Finding replaces the prior audits and retrospective where their earlier claims no longer match the current contract.
