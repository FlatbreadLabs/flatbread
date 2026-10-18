---
id: fnd-streaming-tide-heights-costs-46-kb-s-per-peer--knxqtyqh6xcz1tp9
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Streaming tide heights costs 46 KB/s per peer
kind: measurement
created_at: '2025-11-04T14:00:00Z'
created_by: Sofia Marchetti
derives_from:
  - dec-have-the-host-stream-tide-heights-to-every-peer--a3rb1seedn2bj7k8
---
A compressed tide height field for the area around each player costs 46 KB/s per peer at 10 updates a second. The co-op bandwidth target is 16 KB/s per peer for everything, so host streaming is out by a factor of three before any gameplay traffic.
