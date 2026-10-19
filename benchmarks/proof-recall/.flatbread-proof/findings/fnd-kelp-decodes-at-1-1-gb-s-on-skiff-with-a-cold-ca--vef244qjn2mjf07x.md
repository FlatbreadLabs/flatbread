---
id: fnd-kelp-decodes-at-1-1-gb-s-on-skiff-with-a-cold-ca--vef244qjn2mjf07x
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Kelp decodes at 1.1 GB/s on Skiff with a cold cache
kind: measurement
created_at: '2026-01-12T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - fnd-kelp-decodes-streamed-assets-at-2-9-gb-s-per-cor--32tjx83v8ky28sz4
  - rsk-kelp-s-4-mb-dictionary-may-thrash-the-skiff-cach--rv7ac1hedneqkp0v
invalidates:
  - fnd-kelp-decodes-streamed-assets-at-2-9-gb-s-per-cor--32tjx83v8ky28sz4
cites:
  - cit-codec-benchmark-table-january-2026-skiff-cold-ca--sztretts5cxatw6c
---
The October benchmark that put Kelp at 2.9 GB/s was wrong for our use. It ran on the PC dev box, it loaded Kelp's 4 MB dictionary once before the run, and it decoded every asset class back to back. The dictionary stayed hot in the PC's cache for the whole run.

Streaming never looks like that. Cells arrive in bursts between simulation jobs, and by the time a decode job runs, simulation has evicted the dictionary. Kenji Arakawa reran the benchmark on Skiff retail units with caches flushed before each asset.

Cold, Kelp decodes at 1.1 GB/s and Zstandard at 1.3 GB/s. Zstandard's working set is small enough that a cold start costs it little. Kelp loses on every asset class. The full table is attached.

Kenji Arakawa repeated the cold run on three retail Skiff units, and the spread between units was under 4 percent.
