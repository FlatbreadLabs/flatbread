---
id: iss-proof-memory-reaches-an-agent-only-when-the-agen--xzk3cfypamafeqag
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: Proof memory reaches an agent only when the agent asks
kind: gap
status: open
created_at: '2026-10-18T09:36:42.776Z'
derives_from:
  - fnd-bounded-status-briefing-protocol-halves-effort-g--ht1jd1hsssf7mv2y
cites:
  - cit-delivery-not-storage-cue-anchored-working-memory--v3am6s6wa24gydsa
---

Every Proof read starts with the agent. If the agent does not think to run one, the graph does nothing for that session. A 2026 study reports that coding agents almost never query memory on their own, and that delivering it automatically worked; its figures come from a search summary and are not yet checked.

Candidate ways to deliver memory without changing the read contract:

1. A session-start hook prints `brief` for each active Effort.
2. Once records carry code anchors, an edit hook prints the Decisions anchored to a file before the agent changes it.
3. A generated, clearly marked section of `AGENTS.md` holds the head compactions. It must stay a projection of the graph, never a second place where decisions are made.

Measure any of these with the recall benchmark before adopting it.
