---
id: con-tide-state-must-be-bit-identical-on-every-peer--zrpnp8qjyxzkas7t
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Tide state must be bit-identical on every peer
kind: hard
created_at: '2025-10-31T10:00:00Z'
created_by: Rhea Valdés
derives_from:
  - fnd-float-tides-drift-apart-between-machines-within--znd0wy18bfw2prss
---
Given the same inputs, every machine must produce the same tide state bit for bit, on PC, Meridian, and Skiff, for an entire session. Close enough is not enough: a 1 cm difference flips walkable ground.
