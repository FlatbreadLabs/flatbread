---
id: rsk-skiff-runs-out-of-memory-in-dense-districts--p5pv42sgezzjhpfz
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Skiff runs out of memory in dense districts
state: realized
created_at: '2025-11-14T10:00:00Z'
created_by: Priya Natarajan
derives_from:
  - con-skiff-memory-budget--8ngr8fep3gxdfy80
evidence:
  - fnd-harbor-district-peaks-at-8-6-gb-on-skiff--vccxye8jy3mkba2v
likelihood: medium
severity: high
---
The harbor and the ruins stack audio, tide state, and saltglass textures in one place. If the peak passes the Skiff memory budget, Skiff kills the game with no warning. Cert treats that as a crash.
