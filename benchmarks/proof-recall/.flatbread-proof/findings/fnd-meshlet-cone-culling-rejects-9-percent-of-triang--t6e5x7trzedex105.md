---
id: fnd-meshlet-cone-culling-rejects-9-percent-of-triang--t6e5x7trzedex105
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Meshlet cone culling rejects 9 percent of triangles
kind: measurement
created_at: '2026-05-26T10:00:00Z'
created_by: Rhea Valdés
invalidates:
  - fnd-meshlet-cone-culling-rejects-31-percent-of-trian--7qqt9dr77xyptb85
---
Rhea Valdés recounted the cone-culling numbers. The January count included triangles that back-face culling already removed, so they were counted twice. Cone culling on its own rejects 9 percent of triangles on the cliffs benchmark. It still pays for its 0.1 ms on PC and Meridian; on Skiff it is close to break-even.
