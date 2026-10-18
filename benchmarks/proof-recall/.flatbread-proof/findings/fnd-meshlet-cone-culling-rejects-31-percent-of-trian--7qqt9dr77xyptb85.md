---
id: fnd-meshlet-cone-culling-rejects-31-percent-of-trian--7qqt9dr77xyptb85
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Meshlet cone culling rejects 31 percent of triangles
kind: measurement
created_at: '2026-01-28T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - dec-use-64-vertex-meshlets-with-up-to-124-triangles--67xmt2c2hkv7tr4h
invalidated_by:
  - fnd-meshlet-cone-culling-rejects-9-percent-of-triang--t6e5x7trzedex105
---
Testing each meshlet against a normal cone before rasterizing rejects 31 percent of triangles on the cliffs benchmark, for 0.1 ms of culling work. Cliff faces turned away from the camera are the bulk of it.
