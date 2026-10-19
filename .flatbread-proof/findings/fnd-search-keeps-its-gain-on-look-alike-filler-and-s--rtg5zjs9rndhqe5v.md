---
id: fnd-search-keeps-its-gain-on-look-alike-filler-and-s--rtg5zjs9rndhqe5v
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Search keeps its gain on look-alike filler and saves reading on Sonnet
kind: measurement
created_at: '2026-10-19T12:33:23.668Z'
derives_from:
  - fnd-search-cards-raise-accuracy-and-cut-reading-on-t--ydqm2ybyqjedzw9y
---

Two more single runs of `proof find` against no-brief on the benchmark graph ten times larger, 245 comparable questions each.

- **Look-alike filler (Haiku).** With 30 percent of filler records reusing real subsystem names, `find` got 233.7 right and no-brief 214.7: a gap of 19, the same as on the plain graph (19 to 1 on the questions only one got right, p < 0.0001). `find` read 0.38 of no-brief's tokens. So the earlier gain was not an artifact of filler that is easy to skip.
- **Sonnet.** `find` got 233.4 and no-brief 226.7, a gap of 6.8 that one run cannot separate from noise (11 to 5, p = 0.21). `find` still read 44 percent fewer tokens (9,280 against 16,674) and made 7 tool calls instead of 18. On 24 questions that name no Effort, `find` got 24 and no-brief 17.

A stronger model crawls the graph well enough without search, so it gains less accuracy and keeps most of the token saving. Search helps every model most when the question does not say which Effort it belongs to.
