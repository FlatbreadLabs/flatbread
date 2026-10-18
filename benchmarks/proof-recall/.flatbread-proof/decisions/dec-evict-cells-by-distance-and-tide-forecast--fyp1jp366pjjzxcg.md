---
id: dec-evict-cells-by-distance-and-tide-forecast--fyp1jp366pjjzxcg
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Evict cells by distance and tide forecast
state: accepted
created_at: '2026-01-12T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - fnd-lru-eviction-thrashes-during-tide-turns--0tvj4hmg42jy5d3f
  - fnd-simulated-forecast-eviction-cuts-reloads-by-63--7c086ee2h8dw247k
supersedes:
  - dec-evict-the-least-recently-used-cells-first--4eap3mr9tkafxy2p
---
Score each resident cell by distance from the nearest player and by how soon the tide forecast needs it. Evict the lowest score first. Cells the tide will expose within one turn are never evicted.
