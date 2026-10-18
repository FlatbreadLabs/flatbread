---
id: fnd-a-full-world-snapshot-save-is-310-mb--2c7a78gjb54ygkj4
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: A full world snapshot save is 310 MB
kind: measurement
created_at: '2025-12-04T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - iss-how-should-save-games-store-the-changing-world--kpdhcdkax56a7b7d
---
Serializing every entity and the terrain height field of the slice map produces a 310 MB save that takes 4.2 s to write on Skiff. Players changed less than 1% of that data.
