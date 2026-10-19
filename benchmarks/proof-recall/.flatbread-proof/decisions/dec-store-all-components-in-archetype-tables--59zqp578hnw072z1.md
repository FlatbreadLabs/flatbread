---
id: dec-store-all-components-in-archetype-tables--59zqp578hnw072z1
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Store all components in archetype tables
state: rejected
created_at: '2025-09-17T09:00:00Z'
created_by: Rhea Valdés
derives_from:
  - fnd-archetype-tables-iterate-transforms-2-4x-faster--3xtpgtqs17zzq6v3
  - iss-how-should-kestrel-store-entity-components--aj37s7xz78dszyzp
rejected_by: dec-store-components-in-archetype-tables-and-volatil--yxsjd26wcaz6fgx9
---
Use archetype tables for every component. Iteration speed matters most for transforms, physics proxies, and render handles, and archetype tables win that by 2.4x. The tide spike would need batching of Submerged flips across several frames.
