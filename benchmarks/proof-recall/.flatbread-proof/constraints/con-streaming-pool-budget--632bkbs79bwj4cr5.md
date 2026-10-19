---
id: con-streaming-pool-budget--632bkbs79bwj4cr5
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Streaming pool budget
kind: hard
created_at: '2025-09-12T10:00:00Z'
created_by: Kenji Arakawa
superseded_by:
  - con-streaming-pool-budget--kca88sgh2j6sxvd5
---
The streaming pool, which holds every resident cell's textures, geometry, navigation, and audio, may use at most 2.0 GB on every platform. Streaming must evict before it allocates past that line.
