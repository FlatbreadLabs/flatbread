---
id: blb-codec-benchmark-warm-cache-october-2025--kcybvms2ttten909
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: 'Codec benchmark, warm cache, October 2025'
kind: markdown
created_at: '2025-10-13T15:00:00Z'
created_by: Kenji Arakawa
---
# Codec benchmark, warm cache (PC dev box, one core)

Decode rate in GB/s of output; ratio is uncompressed over compressed.

| Asset class | Kelp ratio | Kelp GB/s | Zstandard ratio | Zstandard GB/s | LZ4 ratio | LZ4 GB/s |
| --- | --- | --- | --- | --- | --- | --- |
| Textures | 3.4 | 3.1 | 3.0 | 1.5 | 2.2 | 3.9 |
| Geometry | 2.9 | 2.8 | 2.7 | 1.3 | 2.0 | 3.8 |
| Audio banks | 1.6 | 2.4 | 1.7 | 1.2 | 1.4 | 3.6 |
| Navigation | 4.1 | 3.0 | 3.8 | 1.6 | 2.6 | 4.0 |
| All assets (weighted) | 3.1 | 2.9 | 2.8 | 1.4 | 2.1 | 3.8 |

Zstandard at level 9; LZ4 in high-compression mode. Kelp dictionary: 4 MB, loaded once before the run.
