---
id: blb-codec-benchmark-cold-cache-on-skiff-january-2026--wczvq0srnnzjs407
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: 'Codec benchmark, cold cache on Skiff, January 2026'
kind: markdown
created_at: '2026-01-09T15:00:00Z'
created_by: Kenji Arakawa
---
# Codec benchmark, cold cache (Skiff retail unit, one core)

Caches flushed before each asset. Decode rate in GB/s of output.

| Asset class | Kelp 4 MB dict GB/s | Zstandard GB/s |
| --- | --- | --- |
| Textures | 1.2 | 1.4 |
| Geometry | 0.8 | 1.2 |
| Audio banks | 1.0 | 1.1 |
| Navigation | 1.3 | 1.5 |
| All assets (weighted) | 1.1 | 1.3 |

LZ4 was not rerun. Spread across three retail units was under 4%.
