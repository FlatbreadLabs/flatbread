---
id: dec-use-virtual-shadow-maps-for-local-lights--619ngez1rrf39xa1
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Use virtual shadow maps for local lights
state: rejected
created_at: '2025-11-12T11:00:00Z'
created_by: Ines Okafor
derives_from:
  - iss-which-shadow-technique-should-lantern-use-for-lo--90dy5vvmare2h2kz
rejected_by: dec-use-a-cached-shadow-atlas-for-local-lights--8p6f2v774he38t5j
---
Give each local light its own virtual shadow map sharing the sun page pool. One system for every light. The harbor would need about 1,500 extra pages.
