---
id: fnd-refraction-cost-screen-space-0-9-ms-ray-marched--pr6bzy3tvstaptdc
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: 'Refraction cost: screen-space 0.9 ms, ray-marched 3.4 ms'
kind: measurement
created_at: '2025-10-02T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - iss-how-should-lantern-render-saltglass-refraction--brndmsn2n8jz6yyk
---
On the cliffs benchmark with saltglass covering 40 percent of the screen, screen-space refraction costs 0.9 ms and a 64-step ray march through the distance field costs 3.4 ms. Local cubemaps cost 0.5 ms but show the wrong place behind the glass whenever the camera moves away from the capture point.
