---
id: dec-use-a-cached-shadow-atlas-for-local-lights--8p6f2v774he38t5j
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Use a cached shadow atlas for local lights
state: accepted
created_at: '2025-11-12T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - iss-which-shadow-technique-should-lantern-use-for-lo--90dy5vvmare2h2kz
---
Local lights render cube or spot shadows into one 8k atlas, cached until something in range moves. The harbor with 40 shadowed lights costs 0.9 ms. Simple and predictable.
