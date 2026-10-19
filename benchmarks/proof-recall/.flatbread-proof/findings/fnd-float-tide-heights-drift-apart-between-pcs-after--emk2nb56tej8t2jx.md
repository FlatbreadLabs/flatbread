---
id: fnd-float-tide-heights-drift-apart-between-pcs-after--emk2nb56tej8t2jx
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Float tide heights drift apart between PCs after 18 minutes
kind: measurement
created_at: '2025-10-10T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - iss-tide-heights-differ-between-co-op-peers--gqmq087dr478v1px
superseded_by:
  - fnd-float-tide-heights-drift-apart-between-pc-and-me--7jb0fg4b5xzr7q5e
---
Marta Lindqvist ran the same tide simulation on two PCs with different CPUs and the same binary. Heights match to the bit for the first minutes, then drift: the difference passes 1 cm, enough to flip a walkable tile, after 18 minutes. The likely cause is differing vector code paths in the math library.
