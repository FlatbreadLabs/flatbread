---
id: fnd-on-two-real-graphs-search-still-wins-and-the-sta--9qssh2p2w9tevfpw
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: On two real graphs search still wins and the state read is neutral
kind: measurement
created_at: '2026-10-19T12:54:53.992Z'
derives_from:
  - fnd-a-state-read-adds-to-search-on-counts-blockers-a--hy9fx5hrw0gbcwzj
  - fnd-search-cards-raise-accuracy-and-cut-reading-on-t--ydqm2ybyqjedzw9y
---

Two real Proof graphs from private projects (200 and 134 records) served as a held-out check that nothing was tuned on. An author blind to `find` and `state` output wrote 39 and 41 machine-checked questions; they stay outside the repository. Haiku answered each set twice with no-brief, `find`, and `find` plus `state`.

- `find` beat no-brief on both graphs: 71.7 against 66.3 of 78, and 75 against 71 of 82. Over both, it alone was right 13 times and no-brief alone 3 times (sign test p = 0.021). It read about half the tokens.
- Adding `state` changed nothing measurable: 1 to 2 and 3 to 4 against `find`, at the same tokens.

So the search gain holds on real memory. The `state` gain seen on the 10x graph's counts and blockers does not appear on graphs a twenty-fifth that size or less, where paging records is cheap; `state` neither helps nor costs there.
