---
id: dec-mark-tide-exposed-instances-visible-for-one-fram--157jf1cesjt3nkrc
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Mark tide-exposed instances visible for one frame after a tide step
state: accepted
created_at: '2026-03-25T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - iss-objects-pop-in-for-one-frame-when-the-tide-uncov--6165dkqm91r63ckf
---
The world streaming system already knows which instances a tide step uncovers. Kenji Arakawa adds a flag for them, and the first culling phase treats flagged instances as visible for one frame.
