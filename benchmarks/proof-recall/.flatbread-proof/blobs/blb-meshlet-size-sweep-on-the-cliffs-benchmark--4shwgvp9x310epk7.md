---
id: blb-meshlet-size-sweep-on-the-cliffs-benchmark--4shwgvp9x310epk7
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Meshlet size sweep on the cliffs benchmark
kind: markdown
created_at: '2025-11-18T15:00:00Z'
created_by: Tomasz Brandt
---
| Max vertices | Max triangles | Meshlets (cliffs) | Raster ms | Culled triangles |
| --- | --- | --- | --- | --- |
| 32 | 60 | 412,000 | 1.42 | 58% |
| 64 | 124 | 208,000 | 1.18 | 54% |
| 128 | 256 | 104,000 | 1.25 | 47% |

Build lantern-2025.11.17-r5260, Meridian devkit, 1440p.
