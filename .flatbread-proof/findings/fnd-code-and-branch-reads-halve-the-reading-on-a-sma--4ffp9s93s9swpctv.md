---
id: fnd-code-and-branch-reads-halve-the-reading-on-a-sma--4ffp9s93s9swpctv
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Code and branch reads halve the reading on a small test bed
kind: measurement
created_at: '2026-10-20T05:22:58.158Z'
derives_from:
  - fnd-search-cards-raise-accuracy-and-cut-reading-on-t--ydqm2ybyqjedzw9y
---

Phase 2 added two reads for teams with many branches: `proof find --path` lists the records that govern a piece of code, and `proof find --refs all` overlays what other branches propose, with a CONFLICTS block. Haiku answered 22 code-context and 22 branch questions twice on a git test bed, each session in its own clone, with the new reads or with read-only git alone.

- Accuracy matched: 85 against 84 of 88 question-runs (2 to 1).
- The new reads cut read tokens by 56 percent (11,642 against 26,283) and tool calls from 13 to 7, on both question sets.

The test bed is small (524 records, about 40 source files), so git and grep reach every answer and both arms sit near the ceiling. The saving is real; an accuracy gain needs a test bed large enough that crawling stops working, as the 10x graph showed for search.
