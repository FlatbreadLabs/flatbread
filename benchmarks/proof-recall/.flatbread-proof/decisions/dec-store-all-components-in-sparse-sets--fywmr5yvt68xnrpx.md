---
id: dec-store-all-components-in-sparse-sets--fywmr5yvt68xnrpx
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Store all components in sparse sets
state: rejected
created_at: '2025-09-17T09:30:00Z'
created_by: Marta Lindqvist
derives_from:
  - fnd-tide-turns-toggle-the-submerged-tag-on-40-000-en--a95p39zkd5ckmg5y
  - iss-how-should-kestrel-store-entity-components--aj37s7xz78dszyzp
rejected_by: dec-store-components-in-archetype-tables-and-volatil--yxsjd26wcaz6fgx9
---
Use sparse sets for every component. Structural changes cost 45 ns instead of 380 ns, which makes the tide spike disappear. Iteration is slower, but Marta Lindqvist argues that most gameplay queries touch few entities.
