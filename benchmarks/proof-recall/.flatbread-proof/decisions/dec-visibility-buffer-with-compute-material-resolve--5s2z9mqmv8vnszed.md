---
id: dec-visibility-buffer-with-compute-material-resolve--5s2z9mqmv8vnszed
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Visibility buffer with compute material resolve; foliage back in the buffer
state: superseded
created_at: '2026-01-20T10:00:00Z'
created_by: Ines Okafor
derives_from:
  - dec-resolve-materials-with-one-uber-shader-over-bind--s9nbq2qn05mk5j6r
  - fnd-meshlet-alpha-masks-bring-foliage-back-into-the--672xvn788702zkn6
supersedes:
  - dec-visibility-buffer-for-opaque-geometry-foliage-an--gvnvp04jgm7kbfh9
superseded_by:
  - dec-visibility-buffer-on-pc-and-meridian-forward-fal--khvgysnhmnkjqe9k
---
Foliage moves back into the visibility buffer using meshlet alpha masks, so only saltglass renders forward. Material resolve runs in compute over the bindless material tables. This removes the second shading path for foliage that the previous version carried.
