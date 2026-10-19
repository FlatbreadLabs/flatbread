---
id: iss-how-should-the-streaming-pool-choose-cells-to-ev--4j47zrsgtxncn9dk
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: How should the streaming pool choose cells to evict?
kind: question
status: resolved
created_at: '2025-10-24T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - con-streaming-pool-budget--632bkbs79bwj4cr5
resolved_by:
  - dec-evict-the-least-recently-used-cells-first--4eap3mr9tkafxy2p
---
When the pool is full and a new cell must load, streaming evicts resident cells. The policy decides how often we reload a cell we just threw away.
