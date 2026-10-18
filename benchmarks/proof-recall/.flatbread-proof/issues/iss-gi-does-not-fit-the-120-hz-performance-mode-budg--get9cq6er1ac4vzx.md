---
id: iss-gi-does-not-fit-the-120-hz-performance-mode-budg--get9cq6er1ac4vzx
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: GI does not fit the 120 Hz performance-mode budget
kind: blocker
status: open
created_at: '2026-03-24T10:00:00Z'
created_by: Ines Okafor
derives_from:
  - con-meridian-120-hz-performance-mode-budget--h9zg6vmd70sr78by
  - fnd-sdf-gi-costs-4-7-ms-on-meridian--sm19rt2f274ajsvr
---
At 4.7 ms SDF GI alone takes more than half of an 8.3 ms performance-mode frame. The 120 Hz mode cannot ship with GI as it is. Some cheaper GI path for performance mode is needed.
