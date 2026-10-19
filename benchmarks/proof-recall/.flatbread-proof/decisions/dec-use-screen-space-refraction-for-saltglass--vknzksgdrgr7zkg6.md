---
id: dec-use-screen-space-refraction-for-saltglass--vknzksgdrgr7zkg6
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Use screen-space refraction for saltglass
state: superseded
created_at: '2025-10-03T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - fnd-refraction-cost-screen-space-0-9-ms-ray-marched--pr6bzy3tvstaptdc
  - iss-how-should-lantern-render-saltglass-refraction--brndmsn2n8jz6yyk
superseded_by:
  - dec-screen-space-refraction-with-a-ray-marched-fallb--2639xtpyrfrvbx1r
invalidated_by:
  - fnd-screen-space-refraction-loses-off-screen-content--k8zvmmdee7wg2fjy
---
Offset the scene-color lookup by the refracted view ray, in screen space. At 0.9 ms it is the cheapest option that shows the right thing behind the glass most of the time.
