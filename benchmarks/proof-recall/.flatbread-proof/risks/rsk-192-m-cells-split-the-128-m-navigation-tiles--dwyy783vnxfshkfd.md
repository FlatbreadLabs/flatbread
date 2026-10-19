---
id: rsk-192-m-cells-split-the-128-m-navigation-tiles--dwyy783vnxfshkfd
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: 192 m cells split the 128 m navigation tiles
state: mitigated
created_at: '2026-04-08T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - dec-partition-the-world-into-192-m-cells--bk9r1c5jwb6fh8tc
mitigated_by: dec-cut-navigation-tiles-to-64-m-so-three-fit-along--snvepk8ygeb3qsjs
likelihood: high
severity: medium
---
Navigation tiles are 128 m, sized for the old cells. A 192 m cell edge cuts every second tile in half, so a tile would belong to two cells and reload with either. Path queries across a seam could fail while one half is missing.
