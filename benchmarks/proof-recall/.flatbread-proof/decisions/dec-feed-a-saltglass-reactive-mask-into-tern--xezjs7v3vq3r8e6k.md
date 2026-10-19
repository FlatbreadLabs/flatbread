---
id: dec-feed-a-saltglass-reactive-mask-into-tern--xezjs7v3vq3r8e6k
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Feed a saltglass reactive mask into Tern
state: accepted
created_at: '2026-05-18T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - fnd-a-saltglass-reactive-mask-removes-90-percent-of--p2mmqg2yj8nz43st
  - iss-tern-ghosting-on-moving-saltglass--2yr3q6zf476wajqp
---
Saltglass writes a reactive mask each frame and Tern trusts the current frame where the mask is set. This fixes the ghosting inside Tern, so there is no case for switching to Halcyon; the reopened Halcyon proposal is rejected again.
