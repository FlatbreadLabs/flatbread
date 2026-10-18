---
id: fnd-quarter-resolution-sdf-gi-costs-1-9-ms-in-perfor--md9qdmtne78wv7mf
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Quarter-resolution SDF GI costs 1.9 ms in performance mode
kind: measurement
created_at: '2026-06-24T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - con-meridian-120-hz-performance-mode-budget--khgjmq18bfr40tyj
  - dec-trace-sdf-gi-at-quarter-resolution-in-performanc--06cqt3mqn3fg5h6e
---
Quarter-resolution tracing measured 1.9 ms on the dunes benchmark in performance mode, not the 1.3 ms hoped for; the upsample filter costs 0.5 ms by itself. Performance mode allows GI at most 1.0 ms. Neither proposal fits as written.
