---
id: fnd-float-tide-heights-drift-apart-between-pc-and-me--7jb0fg4b5xzr7q5e
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Float tide heights drift apart between PC and Meridian within 9 minutes
kind: measurement
created_at: '2025-10-20T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - iss-tide-heights-differ-between-co-op-peers--gqmq087dr478v1px
supersedes:
  - fnd-float-tide-heights-drift-apart-between-pcs-after--emk2nb56tej8t2jx
superseded_by:
  - fnd-float-tides-drift-apart-between-machines-within--znd0wy18bfw2prss
---
Across platforms the drift comes sooner. PC against Meridian passes 1 cm within 9 minutes. The Meridian compiler contracts multiply-adds into fused instructions, which round differently from the PC build.
