---
id: fnd-alpha-tested-foliage-costs-2-1-ms-in-the-visibil--f3g34x2k6fs367eb
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Alpha-tested foliage costs 2.1 ms in the visibility buffer
kind: measurement
created_at: '2025-11-04T10:00:00Z'
created_by: Yusuf Demir
derives_from:
  - dec-adopt-a-visibility-buffer-with-64-bit-instance-a--zwmywxyvnqzvw5xq
---
Dune grass and kelp are alpha-tested. In the visibility buffer the alpha test runs in the raster pass with a texture fetch per pixel, and foliage on the coast benchmark goes from 0.8 ms in forward+ to 2.1 ms. Saltglass cannot live in the buffer at all, because it refracts what is behind it and needs that image first.
