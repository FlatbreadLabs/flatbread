---
id: dec-partition-the-world-into-192-m-cells--bk9r1c5jwb6fh8tc
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Partition the world into 192 m cells
state: accepted
created_at: '2026-04-02T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - fnd-128-m-cells-cost-216-mb-of-per-cell-overhead-on--05dnx4k8a0wjtzdw
  - fnd-a-falling-tide-reloads-18-cells-at-410-mb-s-peak--tjz5vscfrdtazcms
supersedes:
  - dec-partition-the-world-into-128-m-cells--372b6czbjf29ymaw
---
Move to 192 m cells. About 88 cells are resident on Skiff, so overhead falls to roughly 97 MB, and a falling tide reloads 9 cells with a replayed peak of 240 MB/s. That is above the 128 m peak but well under the 410 MB/s of 256 m cells, and the file count drops by half. 192 m is also three 64 m tiles wide.
