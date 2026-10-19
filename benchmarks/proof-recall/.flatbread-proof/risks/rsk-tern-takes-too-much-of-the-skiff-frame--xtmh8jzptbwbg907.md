---
id: rsk-tern-takes-too-much-of-the-skiff-frame--xtmh8jzptbwbg907
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Tern takes too much of the Skiff frame
state: mitigated
created_at: '2025-11-20T13:30:00Z'
created_by: Tomasz Brandt
derives_from:
  - con-frame-budget--wt5rfqh5z444g2cg
  - fnd-tern-costs-3-9-ms-at-quality-and-2-1-ms-at-perfo--dkbskbqfgfwtryq0
mitigated_by: dec-run-tern-on-skiff-at-the-performance-preset--74eqayfa83ybqpe3
likelihood: medium
severity: medium
---
At 3.9 ms, Tern Quality eats 12 percent of the 33.3 ms Skiff frame. If Skiff ever runs faster than 30 Hz, that share grows and something else must give.
