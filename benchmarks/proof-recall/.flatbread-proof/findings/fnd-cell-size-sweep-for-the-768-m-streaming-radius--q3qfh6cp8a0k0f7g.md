---
id: fnd-cell-size-sweep-for-the-768-m-streaming-radius--q3qfh6cp8a0k0f7g
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Cell size sweep for the 768 m streaming radius
kind: measurement
created_at: '2025-09-25T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - con-streaming-pool-budget--632bkbs79bwj4cr5
  - iss-what-cell-size-should-the-world-partition-use--k3bncp2dabkekydq
---
Kenji Arakawa swept three cell sizes over the coast test map. With 512 m cells, 25 cells are resident at about 96 MB each, 2.4 GB in total, which breaks the 2.0 GB streaming pool. With 256 m cells, 49 cells are resident at about 24 MB each, 1.18 GB. With 128 m cells, 169 cells are resident; content per cell is small, but per-cell overhead was not measured yet.
