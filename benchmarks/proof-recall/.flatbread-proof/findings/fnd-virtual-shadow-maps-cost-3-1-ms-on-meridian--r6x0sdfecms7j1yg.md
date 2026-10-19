---
id: fnd-virtual-shadow-maps-cost-3-1-ms-on-meridian--r6x0sdfecms7j1yg
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Virtual shadow maps cost 3.1 ms on Meridian
kind: measurement
created_at: '2025-09-29T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - iss-which-shadow-technique-should-lantern-use-for-su--y4k75xvbgb2fhj85
invalidated_by:
  - fnd-virtual-shadow-maps-cost-1-4-ms-on-meridian-with--mwpybda1vh0ac55e
cites:
  - cit-capture-virtual-shadow-map-prototype--4122x7gedhmg5v15
---
The virtual shadow map prototype, at 16k virtual resolution with 128-texel pages, costs 3.1 ms on the dunes benchmark. Four cascaded shadow maps cost 1.6 ms on the same view. Most of the VSM time is page rasterization. On these numbers VSM is twice the price of CSM.
