---
id: dec-partition-the-world-into-128-m-cells--372b6czbjf29ymaw
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Partition the world into 128 m cells
state: superseded
created_at: '2025-11-20T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - fnd-128-m-cells-should-add-only-40-mb-of-per-cell-ov--ape0tgv597x77p6z
  - fnd-a-falling-tide-reloads-18-cells-at-410-mb-s-peak--tjz5vscfrdtazcms
supersedes:
  - dec-partition-the-world-into-256-m-cells--j002wj4g6pgxg4d3
superseded_by:
  - dec-partition-the-world-into-192-m-cells--bk9r1c5jwb6fh8tc
---
Halve the cell size to 128 m. A tide change then reloads only the narrow coastal cells it touches, and the replayed Skiff trace peaks at 190 MB/s instead of 410 MB/s. Per-cell overhead is estimated at 40 MB in total.
