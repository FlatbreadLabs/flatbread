---
id: fnd-128-m-cells-should-add-only-40-mb-of-per-cell-ov--ape0tgv597x77p6z
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: 128 m cells should add only 40 MB of per-cell overhead
kind: estimate
created_at: '2025-11-14T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - fnd-a-falling-tide-reloads-18-cells-at-410-mb-s-peak--tjz5vscfrdtazcms
  - fnd-cell-size-sweep-for-the-768-m-streaming-radius--q3qfh6cp8a0k0f7g
invalidated_by:
  - fnd-128-m-cells-cost-216-mb-of-per-cell-overhead-on--05dnx4k8a0wjtzdw
---
Each cell carries a 0.25 MB header (bounds, index, dependency list). At 169 resident 128 m cells the headers cost about 40 MB, a fair price for reloading only the cells the tide touches. This is an estimate from header sizes alone.
