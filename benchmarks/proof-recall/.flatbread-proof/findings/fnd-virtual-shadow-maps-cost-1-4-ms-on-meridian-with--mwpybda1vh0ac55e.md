---
id: fnd-virtual-shadow-maps-cost-1-4-ms-on-meridian-with--mwpybda1vh0ac55e
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Virtual shadow maps cost 1.4 ms on Meridian with cached pages
kind: measurement
created_at: '2025-11-24T10:00:00Z'
created_by: Tomasz Brandt
invalidates:
  - fnd-virtual-shadow-maps-cost-3-1-ms-on-meridian--r6x0sdfecms7j1yg
cites:
  - cit-capture-virtual-shadow-maps-with-page-caching--xjxn0ftjsfe4dhcq
---
The September capture had the prototype's debug flag on, which threw away cached pages and redrew the whole pool each frame. With caching as designed, only pages touched by moving objects or by the slow sun drift redraw. Dunes benchmark: 1.4 ms, against 1.6 ms for four cascades.
