---
id: fnd-meshlet-alpha-masks-bring-foliage-back-into-the--672xvn788702zkn6
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Meshlet alpha masks bring foliage back into the visibility buffer at 0.7 ms
kind: measurement
created_at: '2026-01-16T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - dec-use-64-vertex-meshlets-with-up-to-124-triangles--67xmt2c2hkv7tr4h
  - fnd-alpha-tested-foliage-costs-2-1-ms-in-the-visibil--f3g34x2k6fs367eb
---
With 64-vertex meshlets each carrying a coarse alpha-coverage mask, the raster pass skips fully transparent meshlets, and the per-pixel alpha test runs on 22 percent of the pixels it ran on before. Coast benchmark foliage costs 0.7 ms in the buffer against 0.8 ms in the forward pass.
