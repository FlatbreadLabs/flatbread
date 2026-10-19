---
id: fnd-caustics-flicker-at-3-to-6-hz-under-tern--9je5rqt89es3rcz4
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Caustics flicker at 3 to 6 Hz under Tern
kind: measurement
created_at: '2026-01-23T10:00:00Z'
created_by: Yusuf Demir
derives_from:
  - dec-ship-tern-as-lantern-s-only-upscaler--fmreq35nzyjc7k4e
  - dec-splat-caustic-photons-from-a-sun-space-map--gz19gensacx2zh1w
cites:
  - cit-trace-caustic-luminance-under-tern--55mm8xmemz44s5ah
---
Photon jitter changes the caustic pattern every frame. At 720p internal resolution Tern cannot tell new caustic detail from noise, clamps it away on some frames and keeps it on others, and the sand under the dunes flickers at 3 to 6 Hz. Full trace attached. At native resolution there is no visible flicker.
