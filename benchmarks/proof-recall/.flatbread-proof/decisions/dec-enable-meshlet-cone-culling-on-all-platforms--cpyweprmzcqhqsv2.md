---
id: dec-enable-meshlet-cone-culling-on-all-platforms--cpyweprmzcqhqsv2
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Enable meshlet cone culling on all platforms
state: accepted
created_at: '2026-02-03T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - fnd-meshlet-cone-culling-rejects-31-percent-of-trian--7qqt9dr77xyptb85
---
Turn on per-meshlet normal-cone culling everywhere, including the Skiff compute expansion. A 31 percent cut in triangles for 0.1 ms is an easy win.
