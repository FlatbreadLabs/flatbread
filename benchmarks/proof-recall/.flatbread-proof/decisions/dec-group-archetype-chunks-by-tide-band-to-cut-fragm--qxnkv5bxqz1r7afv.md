---
id: dec-group-archetype-chunks-by-tide-band-to-cut-fragm--qxnkv5bxqz1r7afv
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Group archetype chunks by tide band to cut fragmentation
state: accepted
created_at: '2026-01-27T10:00:00Z'
created_by: Rhea Valdés
derives_from:
  - dec-store-components-in-archetype-tables-and-volatil--yxsjd26wcaz6fgx9
  - fnd-archetype-iteration-takes-3-4-ms-in-the-alpha-wo--dawb9m0pa999mhpe
---
Allocate archetype chunks per tide band (dry, intertidal, submerged) so that entities a tide query visits sit in the same chunks. This keeps the hybrid layout and attacks the join cost directly. Expected effect: the Skiff crab join drops below 3.5 ms.
