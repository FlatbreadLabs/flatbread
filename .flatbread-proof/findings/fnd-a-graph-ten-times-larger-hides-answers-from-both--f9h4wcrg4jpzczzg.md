---
id: fnd-a-graph-ten-times-larger-hides-answers-from-both--f9h4wcrg4jpzczzg
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: A graph ten times larger hides answers from both strategies alike
kind: measurement
created_at: '2026-10-18T22:31:30.062Z'
derives_from:
  - dec-compact-an-effort-with-writer-built-superseding--v37k0ef5evtrd59a
  - fnd-on-every-question-brief-cuts-reading-but-not-mis--9r1f6caywmytjr0w
---

The leading theory for why `proof brief` did not raise accuracy was that the benchmark graph was small enough for an agent to read whole. To test it, the benchmark was rebuilt ten times larger (498 to 4,980 records) with inert filler that changes no answer but one, and all 246 questions were asked again on Haiku.

On the 237 questions comparable with the original run:

- Accuracy fell about ten points in both strategies: 220.4 to 197.4 with `brief`, 225.3 to 198.7 without. "Unknown" answers nearly doubled (27 to 49, 22 to 43); agents named a filler record once.
- `brief` gained nothing measurable. Per question it held up better on 26 and worse on 22 (sign test p = 0.67).
- Agents read about the same amount at both sizes (26,000 and 36,000 tokens), so more noise meant more misses. `brief` still read 28 percent less.

So graph size is not why `brief` fails to raise accuracy. The limit is finding a record by what it says: a summary does not hold most details, and paging through ten times more records finds fewer of them. The next test is a text search read. The compaction Decision stands on its cost saving.
