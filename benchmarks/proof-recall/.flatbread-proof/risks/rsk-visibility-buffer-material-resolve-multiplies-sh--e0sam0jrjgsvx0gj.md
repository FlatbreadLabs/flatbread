---
id: rsk-visibility-buffer-material-resolve-multiplies-sh--e0sam0jrjgsvx0gj
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Visibility buffer material resolve multiplies shader permutations
state: mitigated
created_at: '2025-11-20T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - dec-visibility-buffer-for-opaque-geometry-foliage-an--gvnvp04jgm7kbfh9
mitigated_by: dec-resolve-materials-with-one-uber-shader-over-bind--s9nbq2qn05mk5j6r
likelihood: high
severity: medium
---
Resolving materials per tile class means one shader per material per tile class. With 310 saltglass and terrain materials and 6 tile classes that is 1,860 resolve shaders on top of the forward ones. Compile times and the shader count both grow past what the build farm handles today.
