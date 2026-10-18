---
id: fnd-gull-s-tree-walking-interpreter-spends-1-8-ms-on--bj1ge76d3wy5aqq3
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Gull's tree-walking interpreter spends 1.8 ms on 300 crabs
kind: measurement
created_at: '2025-10-15T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - iss-should-gull-run-on-a-tree-walking-interpreter-or--dkfsjk9enx1myhff
---
The slice map's 300 crabs run their AI in Gull. The tree-walking interpreter spends 1.8 ms per frame on them on Meridian, about 11 times what the same logic costs in C++. Hot reload is trivial: the interpreter just reparses the edited file.
