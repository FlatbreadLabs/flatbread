---
id: dec-splat-caustic-photons-from-a-sun-space-map--gz19gensacx2zh1w
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Splat caustic photons from a sun-space map
state: accepted
created_at: '2025-10-15T15:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - fnd-photon-caustics-cost-1-1-ms-from-a-512-by-512-su--2rg1xq89re42cgaj
  - iss-how-should-lantern-draw-saltglass-caustics--a6wcxavrp4ky319s
---
Trace photons from a 512 by 512 sun-space map through the saltglass, jitter them each frame, and splat the hits into a caustic buffer that lighting reads. The pattern follows the real glass shape. Costs 1.1 ms.
