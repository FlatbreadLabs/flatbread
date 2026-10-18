---
id: iss-tide-heights-differ-between-co-op-peers--gqmq087dr478v1px
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Tide heights differ between co-op peers
kind: defect
status: resolved
created_at: '2025-10-08T10:00:00Z'
created_by: Sofia Marchetti
resolved_by:
  - dec-run-the-tide-simulation-in-32-32-fixed-point--c5rjfcnmhne4h05e
  - fnd-fixed-point-tides-match-bit-for-bit-across-all-p--kb3ssw5190e93r4m
---
In a two-player session, one player walked across a sand path that the other player saw under water. Sofia Marchetti logged both machines' tide heights: they agree at session start and differ later. Co-op cannot ship if peers disagree about which ground is walkable.
