---
id: iss-how-should-lantern-cull-geometry--jnrp9qd2fywqvqgw
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: How should Lantern cull geometry?
kind: question
status: resolved
created_at: '2025-10-09T10:00:00Z'
created_by: Tomasz Brandt
resolved_by:
  - dec-move-to-gpu-driven-two-phase-occlusion-culling--6dre481mabxsw6ee
---
The dunes benchmark submits 38,000 draws when the tide is out. The CPU spends more time deciding what to draw than the GPU spends drawing it. Options: GPU-driven culling, or keep CPU culling and add software occlusion.
