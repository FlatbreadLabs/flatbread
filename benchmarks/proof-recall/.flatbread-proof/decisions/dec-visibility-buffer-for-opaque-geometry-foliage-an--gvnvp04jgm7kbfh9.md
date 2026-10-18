---
id: dec-visibility-buffer-for-opaque-geometry-foliage-an--gvnvp04jgm7kbfh9
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Visibility buffer for opaque geometry; foliage and saltglass stay forward
state: superseded
created_at: '2025-11-14T10:00:00Z'
created_by: Ines Okafor
derives_from:
  - fnd-alpha-tested-foliage-costs-2-1-ms-in-the-visibil--f3g34x2k6fs367eb
supersedes:
  - dec-adopt-a-visibility-buffer-with-64-bit-instance-a--zwmywxyvnqzvw5xq
superseded_by:
  - dec-visibility-buffer-with-compute-material-resolve--5s2z9mqmv8vnszed
---
A partial step back. Opaque geometry stays in the 64-bit visibility buffer, but alpha-tested foliage and refractive saltglass render in a forward pass after the resolve. That keeps foliage at 0.8 ms and gives saltglass the resolved scene to refract. Ines Okafor accepts carrying two shading paths until foliage has a better answer.
