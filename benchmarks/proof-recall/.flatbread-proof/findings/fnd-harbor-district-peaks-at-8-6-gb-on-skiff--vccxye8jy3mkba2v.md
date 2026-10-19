---
id: fnd-harbor-district-peaks-at-8-6-gb-on-skiff--vccxye8jy3mkba2v
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Harbor district peaks at 8.6 GB on Skiff
kind: measurement
created_at: '2026-02-18T15:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - con-skiff-memory-budget--nf7qbhsnmcn6v479
  - rsk-skiff-runs-out-of-memory-in-dense-districts--p5pv42sgezzjhpfz
invalidates:
  - fnd-skiff-slice-build-peaks-at-6-9-gb--5hqgdkdbk2tsn8cj
cites:
  - cit-skiff-harbor-memory-capture-build-4127--20svcfra9jy1hd1d
---
Kenji Arakawa and Priya Natarajan captured build 4127 on the harbor route with firmware 1.2 memory limits emulated. Peak use was 8.6 GB, 614 MB over the 8 GB Skiff memory budget, before counting the 300 MB safety margin.

Most of the growth since the vertical slice came from audio banks, which grew by 388 MB when the harbor ambience was split per tide state, and from the tide simulation, which now double buffers two tide cells while the tide turns. The slice capture missed that second tide cell entirely because it ran with one cell loaded at a time.

The peak lasts about 4 seconds, during the tide turn. Outside it the harbor sits near 7.9 GB, which is still too close to the budget to ship.

Next step: the largest single category is the place to cut, not the fastest-growing one. The full per-category numbers are in the attached capture.
