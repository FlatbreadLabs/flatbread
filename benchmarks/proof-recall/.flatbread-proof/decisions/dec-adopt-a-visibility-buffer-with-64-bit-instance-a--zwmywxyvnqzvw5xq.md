---
id: dec-adopt-a-visibility-buffer-with-64-bit-instance-a--zwmywxyvnqzvw5xq
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Adopt a visibility buffer with 64-bit instance and triangle ids
state: superseded
created_at: '2025-10-20T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - fnd-32-bit-visibility-ids-overflow-on-the-dunes-benc--eyjs4sekprhhtddp
supersedes:
  - dec-adopt-a-visibility-buffer-for-all-opaque-geometr--68vchzqgd1avw8q4
superseded_by:
  - dec-visibility-buffer-for-opaque-geometry-foliage-an--gvnvp04jgm7kbfh9
---
Same visibility buffer for all opaque geometry, but the id target is 64-bit: 32 bits of instance and 32 of triangle. The extra 28 MB at 1440p fits inside the render-target memory budget. Material resolve is unchanged.
