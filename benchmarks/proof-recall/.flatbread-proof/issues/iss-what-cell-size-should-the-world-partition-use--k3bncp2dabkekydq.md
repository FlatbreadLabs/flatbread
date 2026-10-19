---
id: iss-what-cell-size-should-the-world-partition-use--k3bncp2dabkekydq
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: What cell size should the world partition use?
kind: question
status: resolved
created_at: '2025-09-18T14:00:00Z'
created_by: Kenji Arakawa
resolved_by:
  - dec-partition-the-world-into-256-m-cells--j002wj4g6pgxg4d3
---
The world partition splits the coast into square cells that stream in and out around each player. Full-detail content streams within 768 m of a player; beyond that, distant glass is drawn from impostors. Cell size sets how many cells are resident, how much each costs, and how much a tide change forces us to reload.
