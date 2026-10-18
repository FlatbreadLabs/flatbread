---
id: fnd-per-question-runs-show-brief-saves-reads-but-not--8js7ncer2qh9tf5h
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Per-question runs show brief saves reads but not accuracy
kind: measurement
created_at: '2026-10-18T17:16:55.799Z'
created_by: Claude
derives_from:
  - dec-compact-an-effort-with-writer-built-superseding--v37k0ef5evtrd59a
  - fnd-one-session-runs-put-the-recall-benchmark-at-its--b91xm78y7dk2x84b
  - iss-proof-has-no-recall-benchmark-to-test-reads-agai--a63fn3b7vskv3psy
---

The recall benchmark's second pilot ran one fresh Sonnet session per
question: the same 46 questions as the first pilot, once starting from
`proof brief` and once without `brief`. Costs come from the session
transcripts.

Five questions turned out not to name their Effort, so agents could not
tell which Effort they meant; both arms missed all five. They are fixed, and
`check.mjs` now warns about any question like them. On the other 41:

- `brief` first: 38 correct. One of its three misses gave the right record's
  id where the question asked for its title.
- No `brief`: 39 correct.
- Graph reads cost 15,365 tokens per question with `brief` and 18,624
  without, a 17.5 percent saving. The saving is not steady: the median
  question saved about 1,000 tokens, and `brief` was cheaper on only 22 of 41. Tool calls were the same (12.3 against 12.1). Each session also spent
  about 19,300 tokens before its first read.

The compaction Decision says to revisit it if agents answer no better from
`brief` than from `records`. On this evidence they do not, so the test as
written is met. But the Decision was made to cut reading cost, not to raise
accuracy, and the saving is real if small. One run of 41 questions on one
model cannot settle either point. A model that answers less reliably, or a
larger graph, would show whether `brief` helps where accuracy is not
already near the ceiling.
