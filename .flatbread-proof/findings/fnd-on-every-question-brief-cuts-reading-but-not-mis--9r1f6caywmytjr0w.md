---
id: fnd-on-every-question-brief-cuts-reading-but-not-mis--9r1f6caywmytjr0w
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: 'On every question, brief cuts reading but not misses'
kind: measurement
created_at: '2026-10-18T19:24:09.600Z'
derives_from:
  - dec-compact-an-effort-with-writer-built-superseding--v37k0ef5evtrd59a
  - fnd-per-question-runs-show-brief-saves-reads-but-not--8js7ncer2qh9tf5h
supersedes:
  - fnd-on-haiku-brief-saves-reads-and-misses-fewer-ques--0xje5qq08853hjxd
---

The recall benchmark's full run asked all 246 questions on Haiku, one fresh headless session per question, once starting from `proof brief` and once without it. Sessions could use only Bash, Read, and Write.

- Accuracy: 221.4 correct with `brief`, 226.3 without. Twelve questions were right only without `brief` and six only with it (sign test p = 0.24). Nine of the twelve were "unknown" answers, where the `brief` agent gave up on a fact the other agent found.
- Reading: graph reads cost 25,949 tokens per question with `brief` and 33,703 without, 23 percent less. The median question saved 5,300 tokens, and `brief` was cheaper on 157 of 246. On the 20 compaction questions it read 13,100 tokens against 44,000.

The third pilot's claim that `brief` avoids misses came from its 46-question sample. On the 44 sound questions both runs asked, each strategy changed its result on only 1 or 2, so the full run reverses that claim. The compaction Decision was made to cut reading cost, and the full run confirms that it does. Its stated reversal test, whether agents answer better from `brief`, is met: they do not. Whether to keep the Decision on cost alone is the owner's call.

Eight questions ask about retracted records, which no read command can list. Both strategies answered "unknown" to all eight, as every earlier run did.
