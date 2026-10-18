---
id: fnd-clamp-exclusion-removes-caustic-flicker-but-ghos--2m4pgjzbz7ze93j5
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Clamp exclusion removes caustic flicker but ghosts caustics for 9 frames
kind: measurement
created_at: '2026-08-12T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - dec-exclude-caustic-luminance-from-tern-s-history-cl--xhxjn26ss343v2k4
---
With caustic light outside the history clamp, the 3 to 6 Hz flicker is gone in the dunes noon trace. But when a cliff shadow or the player crosses the caustics, the old pattern lingers for 9 frames. Tomasz Brandt thinks a reactive mask could fix it, as it did for refraction; nobody has tried yet.
