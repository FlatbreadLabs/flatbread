---
id: fnd-stale-code-anchors-cost-little-and-rename-aware--2kyseq5ryvsxc9jc
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: 'Stale code anchors cost little, and rename-aware reads cut the recovery'
kind: measurement
created_at: '2026-10-20T20:02:52.736Z'
derives_from:
  - fnd-at-scale-code-and-branch-reads-still-match-git-o--e2ws7dke8rr7qbej
---

Phase 3 asked Haiku, twice, 74 questions on the 10x test bed after about ten refactor commits that Proof never saw: two folder moves, file and function renames, a split, a merge, and one behaviour change (a hash interval from 30 to 60 frames while the accepted Decision still says 30). Ten code anchors no longer hold.

- With today's reads, `findcode` got 133 of 148 question-runs and read-only git 129 (11 to 7, p = 0.48), at 27 percent fewer tokens (24,983 against 34,303). On questions about behaviour no single path names it read a third less (29,705 against 45,047) at the same accuracy. On many-branch questions it saved nothing.
- On the refactor set it did slightly worse than git alone (34 against 35; 8 against 10 on holdout). `--path` on a moved file returned nothing, and cards showed old paths with no warning.
- Reads that follow git renames and flag stale anchors lifted answers on the cards from 9 to 12 of 21 on the offline holdout. Paid, they cut refactor-set reading by a fifth (24,125 against 30,248; a third on holdout) and tool calls from 14 to 10, but accuracy did not move (129 against 133 overall, 3 to 7, p = 0.34).

A refactor Proof missed costs less than expected, because git still shows the moves; the stale-anchor notes make recovery cheaper, not more accurate. The remaining misses are graph-wide audits of stale anchors, which agents try to answer by searching for words like "stale" that no read indexes.
