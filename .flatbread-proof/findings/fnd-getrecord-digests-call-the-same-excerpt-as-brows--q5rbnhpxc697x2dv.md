---
id: fnd-getrecord-digests-call-the-same-excerpt-as-brows--q5rbnhpxc697x2dv
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: getRecord digests call the same excerpt() as browse reads
kind: measurement
created_at: '2026-07-19T03:44:49.738Z'
derives_from:
  - iss-agents-cannot-obtain-full-record-bodies-through--ekfpcg6hrkwgy287
---

Inspected `packages/effort-graph/src/digest.ts`: `renderRecord()` always called `excerpt(record.body_excerpt)` (12 lines / 600 chars) for every query type, including `getRecord`.

Decision dec-route-agent-reads-through-the-flatbread-query-en--476qb9qk878yfg62 consequences state that full bodies remain available from single-record lookup. Unit coverage in `digest.test.ts` asserted `[…truncated]` on a `getRecord` digest — locking in the contradiction.

`body_excerpt` on `ReadRecord` already carries the full `_content.raw` from the engine; only the digest renderer truncated it.
