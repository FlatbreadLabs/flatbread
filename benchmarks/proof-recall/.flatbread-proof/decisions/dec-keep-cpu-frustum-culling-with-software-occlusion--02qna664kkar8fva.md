---
id: dec-keep-cpu-frustum-culling-with-software-occlusion--02qna664kkar8fva
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Keep CPU frustum culling with software occlusion
state: rejected
created_at: '2025-10-27T11:00:00Z'
created_by: Rhea Valdés
derives_from:
  - iss-how-should-lantern-cull-geometry--jnrp9qd2fywqvqgw
rejected_by: dec-move-to-gpu-driven-two-phase-occlusion-culling--6dre481mabxsw6ee
---
Keep culling on the CPU and add a software occlusion rasterizer on two worker threads. Kestrel gameplay already knows which objects exist, so this keeps one source of truth. Rhea Valdés expects 1.4 ms back.
