---
id: iss-skill-scoped-records-filter-example-over-constra--vd0gcnpc9cm6jzjh
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Skill scoped-records filter example over-constrains and returns nothing
kind: defect
status: open
created_at: '2026-07-19T02:03:44.673Z'
derives_from:
  - fnd-bounded-status-briefing-protocol-halves-effort-g--ht1jd1hsssf7mv2y
---

The effort-graph skill and reference document the scoped-listing example `flatbread effort records <effortId> --kinds issue,decision --status open --state proposed`. Because filter flags AND across kinds, this requires a single record to satisfy both `status: open` (an Issue field) and `state: proposed` (a Decision field), which no record can. Verified at generation 70 on eff-local-runtime-and-ownership-loop: the combined form returns "0 records", while `--kinds issue,decision` returns 3, `--kinds issue --status open` returns 1, and `--kinds decision --state proposed` returns 1.

In the experiment, agents that followed the documented example got nothing back and then re-ran separate queries, inflating tool calls. Fix the documented example (use two separate scoped queries, or clarify that --status and --state target disjoint kinds) in packages/effort-graph/skills (canonical) and re-sync the generated .agents copy.
