---
id: con-meridian-120-hz-performance-mode-budget--khgjmq18bfr40tyj
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Meridian 120 Hz performance mode budget
kind: hard
created_at: '2026-06-03T10:00:00Z'
created_by: Dara Whitlock
supersedes:
  - con-meridian-120-hz-performance-mode-budget--h9zg6vmd70sr78by
---
As of beta the 120 Hz performance mode is a launch commitment on Meridian. Each frame gets 8.3 ms: Lantern GPU passes get 7.4 ms and 0.9 ms is headroom. The mode may drop GI quality and run Tern's lowest preset, but it must not drop saltglass refraction. GI gets at most 1.0 ms of the 7.4 ms.
