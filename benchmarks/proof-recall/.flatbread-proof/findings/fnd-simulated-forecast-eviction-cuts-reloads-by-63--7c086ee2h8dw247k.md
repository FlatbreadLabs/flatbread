---
id: fnd-simulated-forecast-eviction-cuts-reloads-by-63--7c086ee2h8dw247k
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Simulated forecast eviction cuts reloads by 63%
kind: simulation
created_at: '2026-01-08T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - fnd-lru-eviction-thrashes-during-tide-turns--0tvj4hmg42jy5d3f
invalidated_by:
  - fnd-field-captures-show-forecast-eviction-cuts-reloa--ee6m7fwv4798jdmv
---
Kenji Arakawa simulated an eviction policy that scores cells by distance from the player and by the tide forecast. Over 50 simulated tide cycles, it cuts reloads by 63% against LRU.
