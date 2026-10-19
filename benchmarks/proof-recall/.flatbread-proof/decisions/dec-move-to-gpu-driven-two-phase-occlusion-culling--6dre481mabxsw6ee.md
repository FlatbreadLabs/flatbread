---
id: dec-move-to-gpu-driven-two-phase-occlusion-culling--6dre481mabxsw6ee
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Move to GPU-driven two-phase occlusion culling
state: accepted
created_at: '2025-10-27T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - fnd-cpu-culling-and-draw-submission-cost-3-2-ms-on-t--1y0j1b9p0zjh0n1g
  - iss-how-should-lantern-cull-geometry--jnrp9qd2fywqvqgw
---
Cull instances on the GPU against last frame's depth pyramid, draw the survivors, rebuild the pyramid, then test the rejected ones again. The CPU only uploads instance data. Submission drops from 3.2 ms to 0.6 ms.
