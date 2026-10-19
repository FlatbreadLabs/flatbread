---
id: con-archetype-changes-happen-only-at-frame-sync-poin--kcsrz5g8g8yndwnx
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Archetype changes happen only at frame sync points
kind: soft
created_at: '2025-09-26T09:00:00Z'
created_by: Rhea Valdés
derives_from:
  - dec-store-components-in-archetype-tables-and-volatil--yxsjd26wcaz6fgx9
---
Jobs never move entities between archetype tables directly. They record structural changes in command buffers, and the scheduler flushes those buffers at two sync points per frame: after simulation and after streaming. Sparse tag flips are exempt.
