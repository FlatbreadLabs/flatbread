---
id: fnd-rules-only-proof-holds-decide-builds-a-suspect-w--kfhw06ex8epckc41
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Rules only Proof holds decide builds; a suspect warning helps only when read
kind: measurement
created_at: '2026-10-21T15:52:29.557Z'
derives_from:
  - fnd-a-stale-decision-costs-builds-more-than-proof-gi--pdrkn9kjkejk52kk
---

Two runs on the feature-building benchmark's bed v2.

- Proof-only-hard tasks on Sonnet 5.5 (6 build x 3 runs, 2 plan x 2): each rule is a product decision recorded only in Proof before the feature existed. Builds all-green: none 3 of 18, skill 15, find 15, findcode 11, brief 11, dump 18 of 18. Every Proof arm beats none after Holm correction (dump p = 0.0005, skill and find 0.002, brief and findcode 0.043); per task, skill and dump win 6 to 0. Plans: 0.88-1.00 against 0.25. Search arms lost where the query did not reach the record (findcode 0 of 3 on the type-scale task, where find got 3 of 3).
- The suspect warning on Haiku (stale and code-visible tasks, 3 runs): build all-green of 27 went from 17 to 20 for findcode and 13 to 18 for brief; skill, find and dump did not change. findcode passed the stale shortcut task 3 of 3 after 0 of 3, because sessions opened the Decision and read the warning; where the stale Decision was peripheral, sessions saw only find's summary line and still followed it (0 of 3); one warning inside a full dump changed nothing.

Proof's value turns on whether the record is right: a rule the code cannot teach lifts builds from 3 to 11-18 of 18, while an out-of-date record costs the more of Proof is pasted in. The warning recovers that cost only for agents that open the record, so it belongs on every search hit and at the top of pasted context.
