---
id: fnd-cpu-culling-and-draw-submission-cost-3-2-ms-on-t--1y0j1b9p0zjh0n1g
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: CPU culling and draw submission cost 3.2 ms on the dunes benchmark
kind: measurement
created_at: '2025-10-13T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - iss-how-should-lantern-cull-geometry--jnrp9qd2fywqvqgw
---
Frustum culling, LOD selection and draw submission for the dunes benchmark take 3.2 ms of render-thread time on Meridian. A GPU-driven prototype brings submission to 0.6 ms with two-phase occlusion.
