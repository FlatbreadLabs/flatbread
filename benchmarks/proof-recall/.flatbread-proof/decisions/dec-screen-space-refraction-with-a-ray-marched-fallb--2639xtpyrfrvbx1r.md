---
id: dec-screen-space-refraction-with-a-ray-marched-fallb--2639xtpyrfrvbx1r
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Screen-space refraction with a ray-marched fallback for off-screen rays
state: accepted
created_at: '2026-01-08T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - fnd-refraction-cost-screen-space-0-9-ms-ray-marched--pr6bzy3tvstaptdc
  - fnd-screen-space-refraction-loses-off-screen-content--k8zvmmdee7wg2fjy
supersedes:
  - dec-use-screen-space-refraction-for-saltglass--vknzksgdrgr7zkg6
---
Refraction first tries the screen-space lookup. When the refracted ray leaves the screen, or the depth test from the halo fix rejects the sample, the pixel falls back to a ray march through the saltglass distance field. On the dunes at grazing angles about 40 percent of saltglass pixels take the fallback, and the total refraction cost is 1.8 ms on Meridian, against 0.9 ms for screen-space alone and 3.4 ms for marching everything.

The halo fix stays in. Ray-marching every pixel, the option rejected in October, is still too expensive; this Decision uses the march only where screen space has nothing to show. Past 2 km the fallback samples the sky cubemap instead of marching.

The fallback march is capped at 32 steps, half of the 64 steps the October cost Finding measured.
