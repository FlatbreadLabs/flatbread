---
id: fnd-compaction-and-standing-reads-save-reading-but-s--shrqe59yxa1tbjad
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Compaction and standing reads save reading but show no holdout gain
kind: measurement
created_at: '2026-10-19T15:41:00.659Z'
derives_from:
  - fnd-search-cards-raise-accuracy-and-cut-reading-on-t--ydqm2ybyqjedzw9y
---

Round two of tuning changed two reads, chosen from wrong answers on the tune half of the benchmark: `get` on a compaction now says whether it is stale and what changed, and `records` filters by standing that links decide (`--standing`, `--rests-on`). Haiku then ran `find` twice on the 53 compaction, invalidation and dead-evidence questions, against the earlier build's runs.

- Tune half: 60.3 against 50.3 of 62 question-runs (10 to 0, p = 0.002), at a third fewer tokens.
- Holdout half: 42 against 42 of 44 (1 to 1), at 15 percent fewer tokens.

The accuracy gain stays on the questions the change was built from; holdout, already at 42 of 44, shows none. The reading saving does carry over. Treat a tune-only gain as unproven, and judge later rounds by holdout and the private graphs.
