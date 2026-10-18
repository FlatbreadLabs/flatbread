---
id: dec-partition-the-world-into-512-m-cells--hgbn5yem7vx1hxtt
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Partition the world into 512 m cells
state: rejected
created_at: '2025-09-29T11:00:00Z'
created_by: Rhea Valdés
derives_from:
  - fnd-cell-size-sweep-for-the-768-m-streaming-radius--q3qfh6cp8a0k0f7g
  - iss-what-cell-size-should-the-world-partition-use--k3bncp2dabkekydq
rejected_by: dec-partition-the-world-into-256-m-cells--j002wj4g6pgxg4d3
---
Use 512 m cells and stream lower mips for the outer ring to fit the pool. Fewer, larger files suit the console storage APIs, which prefer big sequential reads.
