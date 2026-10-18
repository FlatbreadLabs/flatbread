---
id: fnd-lru-eviction-thrashes-during-tide-turns--0tvj4hmg42jy5d3f
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: LRU eviction thrashes during tide turns
kind: measurement
created_at: '2026-01-05T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - dec-evict-the-least-recently-used-cells-first--4eap3mr9tkafxy2p
invalidates:
  - dec-evict-the-least-recently-used-cells-first--4eap3mr9tkafxy2p
---
Cells the tide is about to expose have not been touched for a whole cycle, so LRU evicts them first, just before they are needed. In a slice playtest, 38% of tide-turn reloads were cells evicted in the previous 60 seconds.
