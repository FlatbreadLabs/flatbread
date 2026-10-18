---
id: dec-refract-into-local-cubemaps--1aek3p2p2hrfg5b6
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Refract into local cubemaps
state: rejected
created_at: '2025-10-03T12:00:00Z'
created_by: Ines Okafor
derives_from:
  - iss-how-should-lantern-render-saltglass-refraction--brndmsn2n8jz6yyk
rejected_by: dec-use-screen-space-refraction-for-saltglass--vknzksgdrgr7zkg6
---
Capture cubemaps every 50 m along the coast and refract into the nearest one. Cheapest at 0.5 ms, but parallax is wrong and tides make the captures stale every 40 minutes.
