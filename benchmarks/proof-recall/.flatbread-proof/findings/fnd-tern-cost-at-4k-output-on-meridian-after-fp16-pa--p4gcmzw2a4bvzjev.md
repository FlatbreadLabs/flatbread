---
id: fnd-tern-cost-at-4k-output-on-meridian-after-fp16-pa--p4gcmzw2a4bvzjev
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Tern cost at 4K output on Meridian after FP16 packing
kind: measurement
created_at: '2025-12-10T10:00:00Z'
created_by: Tomasz Brandt
supersedes:
  - fnd-tern-cost-at-4k-output-on-meridian--wycx6ek6sfme73k9
superseded_by:
  - fnd-tern-cost-at-4k-output-on-meridian-with-the-reac--81tcpzvhwzcy6wyn
---
Packing the reprojection inputs as FP16 and merging two passes brings Tern at 4K output on Meridian to 1.4 ms on the dunes benchmark, down from 1.9 ms.
