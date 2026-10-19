---
id: dec-evict-cells-in-the-order-they-were-loaded--xyp7a3e2cyjgfkcq
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Evict cells in the order they were loaded
state: rejected
created_at: '2025-10-27T11:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - iss-how-should-the-streaming-pool-choose-cells-to-ev--4j47zrsgtxncn9dk
rejected_by: dec-evict-the-least-recently-used-cells-first--4eap3mr9tkafxy2p
---
Evict the oldest-loaded cell first. Simpler than LRU and needs no per-frame bookkeeping.
