---
id: fnd-screen-space-refraction-loses-off-screen-content--k8zvmmdee7wg2fjy
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Screen-space refraction loses off-screen content at grazing angles
kind: measurement
created_at: '2025-12-04T14:00:00Z'
created_by: Yusuf Demir
invalidates:
  - dec-use-screen-space-refraction-for-saltglass--vknzksgdrgr7zkg6
---
Looking along the dunes at grazing angles, 30 to 45 percent of refracted rays leave the screen, and those pixels show smeared edge color. This is the common view in the game, not a corner case. Screen-space refraction cannot be the answer for saltglass on its own; the vertical slice will ship with the artifact.
