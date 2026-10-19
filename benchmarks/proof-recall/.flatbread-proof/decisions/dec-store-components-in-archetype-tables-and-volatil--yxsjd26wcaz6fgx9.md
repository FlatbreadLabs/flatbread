---
id: dec-store-components-in-archetype-tables-and-volatil--yxsjd26wcaz6fgx9
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Store components in archetype tables and volatile tags in sparse sets
state: accepted
created_at: '2025-09-18T10:00:00Z'
created_by: Rhea Valdés
derives_from:
  - fnd-archetype-tables-iterate-transforms-2-4x-faster--3xtpgtqs17zzq6v3
  - fnd-tide-turns-toggle-the-submerged-tag-on-40-000-en--a95p39zkd5ckmg5y
  - iss-how-should-kestrel-store-entity-components--aj37s7xz78dszyzp
---
Keep hot, stable components (transforms, physics proxies, render handles) in archetype tables. Store volatile tags that flip often, starting with Submerged, Exposed, and Buried, in sparse sets beside the tables. A tide turn then flips sparse entries only, and bulk iteration keeps the archetype speed. Queries that mix the two pay a join.
