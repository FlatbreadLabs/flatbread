---
id: dec-adopt-a-visibility-buffer-for-all-opaque-geometr--68vchzqgd1avw8q4
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Adopt a visibility buffer for all opaque geometry
state: superseded
created_at: '2025-09-26T10:00:00Z'
created_by: Ines Okafor
derives_from:
  - con-frame-budget--f5qxxq5572878wrp
  - fnd-visibility-buffer-prototype-timings--qcfzqvyxbxkf2spw
  - iss-should-lantern-replace-clustered-forward-with-a--7c8zxrdsj59q8hmd
superseded_by:
  - dec-adopt-a-visibility-buffer-with-64-bit-instance-a--zwmywxyvnqzvw5xq
---
Lantern replaces clustered forward+ with a visibility buffer for all opaque geometry. Rasterize instance and triangle ids, then shade each visible pixel once in a resolve pass. The prototype saves 4.4 ms on the cliffs benchmark, which is the single biggest win available against the Frame budget. Saltglass, being transparent, is not opaque geometry and is out of scope here.
