---
id: iss-agents-cannot-obtain-full-record-bodies-through--ekfpcg6hrkwgy287
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Agents cannot obtain full record bodies through CLI reads
kind: defect
status: resolved
created_at: '2026-07-19T03:44:48.333Z'
resolved_by:
  - dec-effort-get-digests-always-include-the-full-recor--xs7rnbha3zx8qdj9
  - fnd-getrecord-digests-call-the-same-excerpt-as-brows--q5rbnhpxc697x2dv
---

Bounded digests excerpt every record body to 12 lines / 600 chars, including `effort get`. Accepted Decision dec-route-agent-reads-through-the-flatbread-query-en--476qb9qk878yfg62 claims full bodies remain available from single-record lookup, but implementation never honored that.

Agents doing status briefing or zoom-in invent missing Decision sections or invent source paths because digests show `[…truncated]` and `_path` is never exposed. This causes hallucination and missed context on long Decision bodies.
