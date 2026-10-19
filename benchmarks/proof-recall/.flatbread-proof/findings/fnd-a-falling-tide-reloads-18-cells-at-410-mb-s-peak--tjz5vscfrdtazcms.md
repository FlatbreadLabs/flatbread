---
id: fnd-a-falling-tide-reloads-18-cells-at-410-mb-s-peak--tjz5vscfrdtazcms
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: A falling tide reloads 18 cells at 410 MB/s peak
kind: measurement
created_at: '2025-11-11T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - dec-partition-the-world-into-256-m-cells--j002wj4g6pgxg4d3
cites:
  - cit-skiff-streaming-trace-stream-trace-1110--fn7z3ms8hsz2tw9c
---
When the tide falls, about 30% of a coastal 256 m cell changes: sand paths appear and glass ridges surface. Today the whole cell reloads. In the Skiff trace, one falling tide reloads 18 cells over 40 seconds with a 410 MB/s peak read rate, and the game drops frames while it does. The trace breaks the reads down by asset type.
