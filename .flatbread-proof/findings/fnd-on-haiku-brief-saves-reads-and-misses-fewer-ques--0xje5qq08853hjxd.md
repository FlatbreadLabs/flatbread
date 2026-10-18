---
id: fnd-on-haiku-brief-saves-reads-and-misses-fewer-ques--0xje5qq08853hjxd
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: 'On Haiku, brief saves reads and misses fewer questions'
kind: measurement
created_at: '2026-10-18T17:56:17.706Z'
derives_from:
  - dec-compact-an-effort-with-writer-built-superseding--v37k0ef5evtrd59a
  - fnd-per-question-runs-show-brief-saves-reads-but-not--8js7ncer2qh9tf5h
superseded_by:
  - fnd-on-every-question-brief-cuts-reading-but-not-mis--9r1f6caywmytjr0w
---

The recall benchmark's third pilot repeated the second on Haiku: the same 46 questions, one fresh session per question, once starting from `proof brief` and once without it. Two questions proved flawed and are left out.

On the other 44:

- `brief` first: 44 correct. No `brief`: 41 correct. Each of the three misses was a question the `brief` arm got right. One was a count of records changed since the head compaction, which `brief` reports directly and which the agent could not rebuild from browse reads, because a record changed in place leaves no dated trace. In the other two the agent gave up and answered "unknown".
- Graph reads cost 31,918 tokens per question with `brief` and 43,391 without, a 26 percent saving. The median question saved about 4,000 tokens, and `brief` was cheaper on 25 of 44.

The second pilot met the letter of the compaction Decision's reversal test, because Sonnet answered as well without `brief`. On a weaker model `brief` both cut reading and avoided misses, so the Decision stands. Three paired misses are still too few to rule out chance (sign test p = 0.25); a run of every question would settle it.
