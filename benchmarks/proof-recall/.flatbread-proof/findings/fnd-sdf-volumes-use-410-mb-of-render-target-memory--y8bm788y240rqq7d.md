---
id: fnd-sdf-volumes-use-410-mb-of-render-target-memory--y8bm788y240rqq7d
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: SDF volumes use 410 MB of render-target memory
kind: measurement
created_at: '2026-03-09T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - rsk-sdf-volumes-outgrow-the-render-target-memory-bud--xfd2pfztvskdcd2c
---
With every ruin in the alpha build loaded, the clipmaps and per-mesh distance fields use 410 MB of the 1.8 GB render-target budget. That fits today, but leaves about 90 MB of slack for new ruins before the 500 MB line the Risk named.
