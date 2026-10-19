---
id: fnd-search-cards-raise-accuracy-and-cut-reading-on-t--ydqm2ybyqjedzw9y
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Search cards raise accuracy and cut reading on the 10x graph
kind: measurement
created_at: '2026-10-19T07:39:20.029Z'
derives_from:
  - fnd-a-graph-ten-times-larger-hides-answers-from-both--f9h4wcrg4jpzczzg
---

`proof find` searches every record by what it says and returns short cards: the current version of each hit, its best passages, any attached Blob passage, and one hop of links. On the benchmark graph ten times larger, Haiku answered the 245 comparable questions twice with `find` and twice without it (no-brief), one fresh session per question.

- Accuracy rose by about 20 questions per run: 231.1 and 229.1 with `find`, against 210.9 and 210.7 without. Over both runs, `find` alone was right 48 times and no-brief alone 12 times (sign test p < 0.0001).
- Agents read 61 percent fewer tokens (13,019 against 33,839 on average) and made 9 tool calls instead of 21.
- "Unknown" answers fell from 32 and 35 per run to 14 and 12.
- No question category lost ground. The gain held on the half of the questions the cards were not tuned on (26 wins, 6 losses), and with the seven timed-out sessions set aside (45 wins, 9 losses).
- On 24 questions that name no Effort, `find` got 46 of 48 and no-brief 31 of 48.

So the limit at scale was finding a record by what it says, as the 10x Finding suggested, and a search read lifts it. Open: the `brief` arm was not rerun, the graph is fictional and its filler easy to tell apart, and only Haiku was tested.
