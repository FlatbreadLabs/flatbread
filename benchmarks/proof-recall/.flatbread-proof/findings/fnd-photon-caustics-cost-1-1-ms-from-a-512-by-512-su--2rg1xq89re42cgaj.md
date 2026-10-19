---
id: fnd-photon-caustics-cost-1-1-ms-from-a-512-by-512-su--2rg1xq89re42cgaj
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Photon caustics cost 1.1 ms from a 512 by 512 sun-space map
kind: measurement
created_at: '2025-10-14T15:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - iss-how-should-lantern-draw-saltglass-caustics--a6wcxavrp4ky319s
---
Tracing one photon per texel of a 512 by 512 sun-space map through the saltglass and splatting the hits costs 1.1 ms on Meridian. Projected textures cost 0.2 ms but do not follow the shape of the glass.
