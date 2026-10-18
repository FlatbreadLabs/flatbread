---
id: fnd-tide-turns-toggle-the-submerged-tag-on-40-000-en--a95p39zkd5ckmg5y
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: 'Tide turns toggle the Submerged tag on 40,000 entities'
kind: measurement
created_at: '2025-09-15T11:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - iss-how-should-kestrel-store-entity-components--aj37s7xz78dszyzp
---
The tide turns every 20 minutes, twice per 40-minute cycle. In the coast test map, 40,000 entities gain or lose the Submerged tag on each turn. With archetype tables every flip moves a row: 40,000 x 380 ns is 15.2 ms on the main thread in one frame. With sparse sets the same flips cost 1.8 ms. Marta Lindqvist expects the count to double once the full coast is populated.
