---
id: fnd-archetype-iteration-takes-3-4-ms-in-the-alpha-wo--dawb9m0pa999mhpe
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: 'Archetype iteration takes 3.4 ms in the alpha world, not 1.9 ms'
kind: measurement
created_at: '2026-01-19T10:00:00Z'
created_by: Rhea Valdés
derives_from:
  - fnd-archetype-tables-iterate-transforms-2-4x-faster--3xtpgtqs17zzq6v3
invalidates:
  - fnd-archetype-tables-iterate-transforms-2-4x-faster--3xtpgtqs17zzq6v3
---
Rhea Valdés repeated the transform iteration test on a capture of the alpha world instead of the synthetic ecs-bench world. The September benchmark spawned every entity from a single template, so nearly all entities shared one table and the iteration was one long linear walk. That is not what a real coast looks like.

The alpha world has 912 archetypes. Most tables hold fewer than 2,000 rows, so the iterator jumps between tables constantly and the hardware prefetcher never settles. Iterating one million transforms takes 3.4 ms on the PC dev box, not 1.9 ms. Sparse sets on the same capture take 4.9 ms, so archetype tables still win, but by 1.4x and not 2.4x.

The join between archetype tables and sparse tags is the bigger surprise. On Skiff the join of transforms with the Submerged tag across the crab herd takes 5.1 ms, which is most of a 30 Hz frame's simulation share. The September numbers should not be quoted again.
