---
id: rsk-sdf-volumes-outgrow-the-render-target-memory-bud--xfd2pfztvskdcd2c
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: SDF volumes outgrow the render-target memory budget
state: accepted
created_at: '2025-11-06T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - con-render-target-memory-on-meridian--q4szajxse9c1csdv
  - dec-use-signed-distance-field-gi--yn366zmp3k7snd9w
evidence:
  - fnd-sdf-volumes-use-410-mb-of-render-target-memory--y8bm788y240rqq7d
likelihood: medium
severity: medium
---
Four 64-cubed clipmaps plus the per-mesh distance fields could pass 500 MB once all the ruins are in. That would squeeze shadow pages and the visibility buffer inside 1.8 GB.
