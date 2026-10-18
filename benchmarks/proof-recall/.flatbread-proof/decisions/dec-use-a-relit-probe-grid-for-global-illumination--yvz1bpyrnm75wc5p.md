---
id: dec-use-a-relit-probe-grid-for-global-illumination--yvz1bpyrnm75wc5p
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Use a relit probe grid for global illumination
state: rejected
created_at: '2025-10-20T13:00:00Z'
created_by: Yusuf Demir
derives_from:
  - iss-how-should-lantern-do-global-illumination--3hs82xftkrdhk3f7
rejected_by: dec-use-signed-distance-field-gi--yn366zmp3k7snd9w
---
Place probes on a 1 m grid near the player and 4 m further out, and relight them each frame from the sun and sky. Cheap at about 0.6 ms. Leaks through thin saltglass walls are the known weakness.
