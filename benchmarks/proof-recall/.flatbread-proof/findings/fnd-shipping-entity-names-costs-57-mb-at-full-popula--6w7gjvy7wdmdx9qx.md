---
id: fnd-shipping-entity-names-costs-57-mb-at-full-popula--6w7gjvy7wdmdx9qx
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Shipping entity names costs 57 MB at full population
kind: measurement
created_at: '2025-11-06T11:00:00Z'
created_by: Rhea Valdés
derives_from:
  - iss-entity-debug-names-are-missing-in-release-builds--e00p8nba80n2ykb8
---
A Name component averages 48 bytes. At the 1.2 million entities of a fully populated coast that is 57 MB, which no console budget can spare. The crash pipeline can map entity numbers back to names from the build's symbol file instead.
