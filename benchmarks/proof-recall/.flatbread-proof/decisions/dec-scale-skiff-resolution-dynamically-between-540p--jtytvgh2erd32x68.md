---
id: dec-scale-skiff-resolution-dynamically-between-540p--jtytvgh2erd32x68
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Scale Skiff resolution dynamically between 540p and 720p
state: superseded
created_at: '2025-11-05T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - con-frame-budget--wt5rfqh5z444g2cg
  - iss-how-should-skiff-hold-its-frame-budget-when-the--1zdpg3npqmscp42d
superseded_by:
  - dec-raise-the-skiff-dynamic-resolution-floor-to-576p--fep9q7m08pp9f0bb
---
Lantern already has a dynamic resolution path for PC. On Skiff it will drop the internal resolution from 720p to as low as 540p when the GPU frame runs over. The HUD stays at native 720p. Tomasz Brandt measured the 540p floor at 26 ms on the worst dune view, inside 33.3 ms.
