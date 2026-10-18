---
id: dec-evict-the-least-recently-used-cells-first--4eap3mr9tkafxy2p
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Evict the least recently used cells first
state: superseded
created_at: '2025-10-27T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - iss-how-should-the-streaming-pool-choose-cells-to-ev--4j47zrsgtxncn9dk
superseded_by:
  - dec-evict-cells-by-distance-and-tide-forecast--fyp1jp366pjjzxcg
invalidated_by:
  - fnd-lru-eviction-thrashes-during-tide-turns--0tvj4hmg42jy5d3f
---
Evict the cell that was touched longest ago. Cheap to track and well understood.
