---
id: dec-use-signed-distance-field-gi--yn366zmp3k7snd9w
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Use signed-distance-field GI
state: accepted
created_at: '2025-10-20T14:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - fnd-probe-grid-leaks-light-through-thin-saltglass-wa--h2hdqdfj92mnmkbj
  - fnd-sdf-gi-costs-2-2-ms-on-meridian--r7t7zy97nwxxxctd
  - iss-how-should-lantern-do-global-illumination--3hs82xftkrdhk3f7
---
Trace short cones against a signed-distance-field clipmap of the scene, four cascades of 64 cubed. Thin saltglass walls block light correctly because the distance field knows they are there. At 2.2 ms on Meridian it fits the Frame budget.
