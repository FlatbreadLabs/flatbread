---
id: dec-use-virtual-shadow-maps-for-the-sun--x8nqkn9q7eaf1ap4
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Use virtual shadow maps for the sun
state: accepted
created_at: '2025-09-30T11:00:00Z'
created_by: Ines Okafor
derives_from:
  - iss-which-shadow-technique-should-lantern-use-for-su--y4k75xvbgb2fhj85
supersedes:
  - dec-use-cascaded-shadow-maps-with-four-cascades--s5c1y9jaf275afzr
reopen_history:
  - at: '2026-01-12T10:00:00.000Z'
    reason: >-
      The cost Finding that sank virtual shadow maps was a capture error; with
      cached pages VSM costs 1.4 ms, less than four cascades. Cascade seams
      through saltglass remain unsolved under CSM.
    rejected_by: dec-use-cascaded-shadow-maps-with-four-cascades--s5c1y9jaf275afzr
---
Sun shadows use one 16k virtual shadow map split into 128-texel pages, allocated where the camera needs detail and cached between frames. Resolution follows the screen, so there are no cascade boundaries to show through saltglass. Pages for static geometry stay valid until the sun moves far enough or a tide step changes the terrain.

Page caching is the whole point: a static scene should redraw only a few hundred pages a frame. The page pool holds 4,096 pages, which is 256 MB inside the render-target memory budget. Moving objects use a small separate page set that is redrawn every frame. Tomasz Brandt will own page management; Ines Okafor owns the sampling side.

Beyond 1.2 km, VSM pages are not allocated at all; a distance-field shadow covers 1.2 km to 2 km.
