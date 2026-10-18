---
id: dec-resolve-materials-with-one-uber-shader-over-bind--s9nbq2qn05mk5j6r
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Resolve materials with one uber shader over bindless material tables
state: accepted
created_at: '2025-12-02T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - dec-visibility-buffer-for-opaque-geometry-foliage-an--gvnvp04jgm7kbfh9
  - rsk-visibility-buffer-material-resolve-multiplies-sh--e0sam0jrjgsvx0gj
---
Material resolve uses one uber shader per tile class that reads material parameters from bindless material tables, instead of one shader per material. The shader count for resolve drops from 1,860 to 6. Cost on the cliffs benchmark rises 0.2 ms because of branching, which Tomasz Brandt accepts.
