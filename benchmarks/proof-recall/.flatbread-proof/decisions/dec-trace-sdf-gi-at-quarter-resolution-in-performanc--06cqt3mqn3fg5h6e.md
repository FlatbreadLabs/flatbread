---
id: dec-trace-sdf-gi-at-quarter-resolution-in-performanc--06cqt3mqn3fg5h6e
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Trace SDF GI at quarter resolution in performance mode
state: proposed
created_at: '2026-04-10T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - iss-gi-does-not-fit-the-120-hz-performance-mode-budg--get9cq6er1ac4vzx
---
Keep SDF GI in performance mode but trace at quarter resolution and upsample with a depth-aware filter. Thin walls stay correct. Tomasz Brandt expects about 1.3 ms.
