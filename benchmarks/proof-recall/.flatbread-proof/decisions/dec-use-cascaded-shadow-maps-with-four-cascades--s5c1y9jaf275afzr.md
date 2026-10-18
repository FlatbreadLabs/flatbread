---
id: dec-use-cascaded-shadow-maps-with-four-cascades--s5c1y9jaf275afzr
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Use cascaded shadow maps with four cascades
state: superseded
created_at: '2025-09-30T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - fnd-virtual-shadow-maps-cost-3-1-ms-on-meridian--r6x0sdfecms7j1yg
  - iss-which-shadow-technique-should-lantern-use-for-su--y4k75xvbgb2fhj85
superseded_by:
  - dec-use-virtual-shadow-maps-for-the-sun--x8nqkn9q7eaf1ap4
---
Sun shadows use four cascaded shadow maps out to 2 km, with the last cascade updated every fourth frame. Cost is 1.6 ms on the dunes benchmark against 3.1 ms for virtual shadow maps. The technique is well understood and needs no new page management.
