---
id: iss-proof-has-no-recall-benchmark-to-test-reads-agai--a63fn3b7vskv3psy
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Proof has no recall benchmark to test reads against
kind: gap
status: open
created_at: '2026-10-18T09:36:38.806Z'
derives_from:
  - dec-compact-an-effort-with-writer-built-superseding--v37k0ef5evtrd59a
  - fnd-bounded-status-briefing-protocol-halves-effort-g--ht1jd1hsssf7mv2y
  - fnd-brief-is-84-percent-smaller-than-the-status-brie--qhgmcvqdma6rq4rq
---

The compaction Decision can be reversed if agents answer no better from `brief` than from filtered `records` reads, but nothing measures answer quality. The size measurement shows `brief` is 84 percent smaller; it says nothing about whether answers stay correct. Every later change to reads or memory has the same problem.

Public memory benchmarks such as LongMemEval test recall of chat history, not of project decisions, so none fits.

Close this Issue with a repo-local benchmark, run like the earlier 12-run status-briefing experiment:

1. 20 to 40 questions with answers fixed by the graph: current rules, open work, why an alternative was rejected.
2. Agents answer under each read strategy: `brief`, `records`, and raw files.
3. Each run is scored on correct answers, tokens, and tool calls.
