---
id: fnd-archetype-tables-iterate-transforms-2-4x-faster--3xtpgtqs17zzq6v3
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Archetype tables iterate transforms 2.4x faster than sparse sets
kind: measurement
created_at: '2025-09-10T10:00:00Z'
created_by: Rhea Valdés
derives_from:
  - iss-how-should-kestrel-store-entity-components--aj37s7xz78dszyzp
invalidated_by:
  - fnd-archetype-iteration-takes-3-4-ms-in-the-alpha-wo--dawb9m0pa999mhpe
cites:
  - cit-ecs-bench-profile-run-0909--m0zy2gppwwgsv5zh
---
Rhea Valdés ran ecs-bench with one million entities on the PC dev box. Iterating every transform takes 1.9 ms with archetype tables and 4.6 ms with sparse sets. The cost runs the other way for structural changes: adding or removing one component costs 380 ns with archetype tables, because the row moves to a new table, and 45 ns with sparse sets. The hybrid layout sits close to the best of both. The full profile, including memory per layout, is in the attached capture.
