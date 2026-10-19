---
id: dec-lower-the-skiff-dynamic-resolution-floor-to-504p--15esnt90gcn29enn
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Lower the Skiff dynamic resolution floor to 504p behind Tern
state: accepted
created_at: '2026-07-22T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - con-frame-budget--br0qszfg8fys908n
  - dec-run-tern-on-skiff-at-the-performance-preset--74eqayfa83ybqpe3
  - fnd-the-576p-floor-misses-the-40-hz-budget-in-tide-s--gqnqc4vef424e5af
  - iss-how-should-skiff-hold-its-frame-budget-when-the--1zdpg3npqmscp42d
supersedes:
  - dec-raise-the-skiff-dynamic-resolution-floor-to-576p--fep9q7m08pp9f0bb
---
Dynamic resolution on Skiff now ranges from 504p to 720p. The floor relies on Tern at the Performance preset to rebuild a clean 720p image; without Tern, 504p would shimmer worse than 540p did. The 30 Hz mode rarely drops below 600p.
