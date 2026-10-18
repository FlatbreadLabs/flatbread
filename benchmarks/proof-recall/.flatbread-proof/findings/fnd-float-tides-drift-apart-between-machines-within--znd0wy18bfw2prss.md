---
id: fnd-float-tides-drift-apart-between-machines-within--znd0wy18bfw2prss
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Float tides drift apart between machines within 6 minutes
kind: measurement
created_at: '2025-10-29T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - iss-tide-heights-differ-between-co-op-peers--gqmq087dr478v1px
supersedes:
  - fnd-float-tide-heights-drift-apart-between-pc-and-me--7jb0fg4b5xzr7q5e
cites:
  - cit-tide-drift-log-tide-drift-1028--3dpqqgs1ep6qm1wc
---
With Skiff in the mix, float tides drift apart between machines within 6 minutes. The worst pair is PC against Skiff, which passes the 1 cm threshold first. Two causes stack: fused multiply-add contraction, and a Skiff sin() that differs by one ulp. Any co-op session longer than 6 minutes will disagree about walkable ground. The per-pair numbers and the first tile to flip are in the drift log.
