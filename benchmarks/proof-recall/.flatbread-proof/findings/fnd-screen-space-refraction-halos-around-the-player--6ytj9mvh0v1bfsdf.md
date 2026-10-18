---
id: fnd-screen-space-refraction-halos-around-the-player--6ytj9mvh0v1bfsdf
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Screen-space refraction halos around the player
kind: measurement
created_at: '2025-11-26T10:00:00Z'
created_by: Yusuf Demir
derives_from:
  - dec-use-screen-space-refraction-for-saltglass--vknzksgdrgr7zkg6
---
When the player stands in front of saltglass, the refraction samples the player instead of what is behind the glass, leaving a bright halo two to six pixels wide around the silhouette. A depth test on the offset sample removes most of it.
