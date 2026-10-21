---
id: fnd-a-stale-decision-costs-builds-more-than-proof-gi--pdrkn9kjkejk52kk
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: A stale Decision costs builds more than Proof gives them
kind: measurement
created_at: '2026-10-21T07:20:17.954Z'
derives_from:
  - fnd-stale-code-anchors-cost-little-and-rename-aware--2kyseq5ryvsxc9jc
---

A feature-building benchmark (benchmarks/proof-build) asked Haiku to build or plan features in a small TypeScript editor from product-sense requests, with the same code and request in every arm and only Proof access changing: none, the skill alone, find, find with --path and --refs, every brief pasted, and every live record pasted. 18 build tasks ran 3 times and 8 plan tasks twice per arm (446 sessions). Hidden acceptance, constraint and regression tests graded builds; a blinded judge scored plans.

- Builds all-green: none 47 of 54 (87%), skill 41, find 40, findcode 41, brief 37, dump 36 (67%). Processed tokens rose to 1.3x, 1.5x and 2.0x of none as more Proof was forced in.
- One stale accepted Decision, saying shortcuts are registered in a file a refactor had turned into the frozen plugin table, caused most of the loss: every task that adds a shortcut broke plugin API v1 in Proof arms (B-S3: none 3 of 3, every Proof arm 0 of 3). findcode sessions saw the stale-anchor note and followed the Decision anyway.
- Proof-only build tasks showed no gain (none 17 of 18): the code's own patterns taught the recorded rules.
- Plans: pasted Proof lifted proof-only plans (dump 1.00 against 0.90) and dragged stale ones (0.76 against 1.00); overall equal.
- Not significant on the pre-registered tests (best Holm p 0.31; pooled dump p 0.059); counted per task, 1 against 4 tasks, because the harm sits in tasks sharing one record.

Proof in context did not improve building here, and an out-of-date Decision cost more than flagging its anchor could recover. A Decision whose evidence or code has moved needs to read as suspect itself.
