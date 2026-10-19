---
id: fnd-tide-storms-push-skiff-40-hz-frames-to-28-4-ms-o--28gemvtznv4zztdc
effort: eff-meridian-and-skiff-ports--ns2t7htkafx7v3xx
title: Tide storms push Skiff 40 Hz frames to 28.4 ms on the CPU
kind: measurement
created_at: '2026-08-10T15:00:00Z'
created_by: Priya Natarajan
derives_from:
  - dec-lower-the-skiff-dynamic-resolution-floor-to-504p--15esnt90gcn29enn
---
Priya Natarajan captured the full storm sequence on a retail-firmware Skiff. Even at the 504p floor, the CPU frame reached 28.4 ms in the 40 Hz mode, over the 25 ms budget. Storm particles and their tide collision cost 6.1 ms of it. The GPU stayed inside budget.
