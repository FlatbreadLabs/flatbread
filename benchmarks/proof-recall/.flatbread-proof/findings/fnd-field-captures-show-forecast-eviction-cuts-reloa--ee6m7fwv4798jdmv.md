---
id: fnd-field-captures-show-forecast-eviction-cuts-reloa--ee6m7fwv4798jdmv
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: 'Field captures show forecast eviction cuts reloads by 22%, not 63%'
kind: measurement
created_at: '2026-03-04T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - dec-evict-cells-by-distance-and-tide-forecast--fyp1jp366pjjzxcg
  - fnd-simulated-forecast-eviction-cuts-reloads-by-63--7c086ee2h8dw247k
invalidates:
  - fnd-simulated-forecast-eviction-cuts-reloads-by-63--7c086ee2h8dw247k
cites:
  - cit-pool-occupancy-capture-pool-occupancy-0303--5k8w8xj2a4g21wtm
---
Kenji Arakawa captured pool behaviour across twelve alpha playtest sessions and replayed the same sessions under LRU for comparison. Forecast eviction is better, but nowhere near the simulation's figure: it cuts reloads by 22%, not 63%.

The tide half of the score works as designed. No cell the tide exposed had to reload during a turn. The distance half is the problem. Each resident cell is scored by straight-line distance from the nearest player, and players do not move like that.

The simulation assumed players walk in straight lines toward a goal. Real players double back to pick up salvage, look at caustics, or wait for a friend, so a cell evicted for being behind the player is often needed again a minute later. In the field captures, players reversed direction 3.4 times per minute on average.

The decision stands, because 22% is still a gain and the tide protection matters most. The 63% figure should not be quoted.
