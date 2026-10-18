---
id: dec-use-64-vertex-meshlets-with-up-to-124-triangles--67xmt2c2hkv7tr4h
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Use 64-vertex meshlets with up to 124 triangles
state: accepted
created_at: '2025-11-21T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - fnd-meshlet-size-sweep-on-the-cliffs-benchmark--zeg5q7pn92jd42x3
  - iss-what-meshlet-size-should-lantern-use--myg13k3gkk2b61nj
---
Build all saltglass and terrain meshes into meshlets of at most 64 vertices and 124 triangles. Fastest raster in the sweep, and fine enough for per-meshlet culling.
