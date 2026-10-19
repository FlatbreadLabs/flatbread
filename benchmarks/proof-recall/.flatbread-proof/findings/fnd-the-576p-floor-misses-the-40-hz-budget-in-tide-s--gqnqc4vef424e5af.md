---
id: fnd-the-576p-floor-misses-the-40-hz-budget-in-tide-s--gqnqc4vef424e5af
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: The 576p floor misses the 40 Hz budget in tide storms
kind: measurement
created_at: '2026-07-20T14:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - con-frame-budget--br0qszfg8fys908n
  - dec-raise-the-skiff-dynamic-resolution-floor-to-576p--fep9q7m08pp9f0bb
---
Tomasz Brandt captured the 40 Hz mode during a tide storm on the dunes. At the 576p floor the GPU frame reached 26.9 ms, over the 25 ms budget, for 14 seconds. At 504p it fell to 23.8 ms. Side by side, Tern Performance from 504p looked better than the old 540p image because Tern now reuses saltglass history, and caustic shimmer stayed at 2 of 10 views.
