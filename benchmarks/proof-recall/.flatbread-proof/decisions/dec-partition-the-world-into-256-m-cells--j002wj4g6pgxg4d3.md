---
id: dec-partition-the-world-into-256-m-cells--j002wj4g6pgxg4d3
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Partition the world into 256 m cells
state: superseded
created_at: '2025-09-29T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - fnd-cell-size-sweep-for-the-768-m-streaming-radius--q3qfh6cp8a0k0f7g
  - iss-what-cell-size-should-the-world-partition-use--k3bncp2dabkekydq
superseded_by:
  - dec-partition-the-world-into-128-m-cells--372b6czbjf29ymaw
---
Use 256 m cells. They fit the streaming pool with room to spare (1.18 GB of 2.0 GB) and keep the file count low. The tide is not yet modelled in streaming; Kenji Arakawa will revisit once tides change terrain in the build.
