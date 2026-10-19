---
id: blb-timing-table-visibility-buffer-prototype-against--8debfkdp7fz7nwjp
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: 'Timing table: visibility buffer prototype against forward+'
kind: markdown
created_at: '2025-09-22T15:00:00Z'
created_by: Tomasz Brandt
---
| Pass (cliffs_bench_02, Meridian, 1440p) | Forward+ (ms) | Visibility buffer (ms) |
| --- | --- | --- |
| Depth prepass | 1.1 | - |
| Visibility raster | - | 1.2 |
| Material resolve | - | 1.9 |
| Opaque shading | 7.9 | 1.5 |
| Total opaque | 9.0 | 4.6 |

Extra memory for a 64-bit visibility target at 4K: 96 MB. The 32-bit target used here costs 48 MB at 4K.
Build lantern-2025.09.19-r4520, captured by hand on devkit MRD-0031.
