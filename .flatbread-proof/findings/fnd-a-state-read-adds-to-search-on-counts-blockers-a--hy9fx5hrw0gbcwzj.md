---
id: fnd-a-state-read-adds-to-search-on-counts-blockers-a--hy9fx5hrw0gbcwzj
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: 'A state read adds to search on counts, blockers and status history'
kind: measurement
created_at: '2026-10-19T12:41:23.560Z'
derives_from:
  - fnd-search-cards-raise-accuracy-and-cut-reading-on-t--ydqm2ybyqjedzw9y
---

`proof state <effortId>` prints what search cannot: exact counts, open blockers and what they gate, contested topics, Issues closed without a fix, dead evidence and dated changes. On the benchmark graph ten times larger, Haiku answered the 97 count, status-history, blocker and dead-evidence questions twice with `find` plus `state` and twice with `find` alone.

- Accuracy rose by about 5 questions per run: 181 against 171 of 194 question-runs. Over both runs, only `find` plus `state` was right 15 times and only `find` 5 times (sign test p = 0.041).
- It read 18 percent fewer tokens (15,578 against 18,907) and made 9 tool calls instead of 12.
- On the half of the questions `state` was not shaped on, it led 83 to 79 of 88 (5 to 1). That points the same way but is too small to show on its own.

Offline, `state` alone held the answer for 55 percent of these questions on that half, below its 60 percent bar. It earns its place by covering what `find` misses, not by answering alone. The plan's mark (at least 4 more per run, no rise in tokens) is met.
