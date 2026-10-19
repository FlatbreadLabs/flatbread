---
id: dec-use-128-vertex-meshlets-with-up-to-256-triangles--2ta4nkmwjgrd29bh
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Use 128-vertex meshlets with up to 256 triangles
state: rejected
created_at: '2025-11-21T11:00:00Z'
created_by: Rhea Valdés
derives_from:
  - iss-what-meshlet-size-should-lantern-use--myg13k3gkk2b61nj
rejected_by: dec-use-64-vertex-meshlets-with-up-to-124-triangles--67xmt2c2hkv7tr4h
---
Larger meshlets halve the meshlet count and the culling dispatch size, and match what Kestrel tools already export. Rhea Valdés prefers fewer, bigger units.
