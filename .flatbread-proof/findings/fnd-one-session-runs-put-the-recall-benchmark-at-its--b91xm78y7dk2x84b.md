---
id: fnd-one-session-runs-put-the-recall-benchmark-at-its--b91xm78y7dk2x84b
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: One-session runs put the recall benchmark at its ceiling
kind: measurement
created_at: '2026-10-18T10:41:18.945Z'
created_by: Claude
derives_from:
  - dec-compact-an-effort-with-writer-built-superseding--v37k0ef5evtrd59a
  - iss-proof-has-no-recall-benchmark-to-test-reads-agai--a63fn3b7vskv3psy
---

The recall benchmark now exists in `benchmarks/proof-recall`: 498 records and
246 questions about a fictional game, across five Efforts, each answer proved
against the built graph. Its first pilot shows that the obvious way to run it
measures nothing.

Two fresh agents each answered the same stratified sample of 46 questions in
one session. Starting from `proof brief`, one scored 46 of 46 with 46 tool
calls and 203,004 tokens. Without `brief`, the other scored 45 of 46 with 27
tool calls and 239,556 tokens. Both read most of the graph early and answered
from it, so the tiers stopped mattering. The only miss was an exact count of
records changed since a compaction, which the `brief` envelope reports
directly.

Two rules follow for any run that is meant to compare read strategies:

1. One fresh session per question, so the cost of finding the answer is paid
   each time instead of once.
2. Tokens and tool calls come from the agent harness. The agents' own tallies
   were 2.4 and 4.5 times the harness counts.

If per-question runs still score at the ceiling, cap tool calls per question
or grow the graph past what one agent can read whole.
