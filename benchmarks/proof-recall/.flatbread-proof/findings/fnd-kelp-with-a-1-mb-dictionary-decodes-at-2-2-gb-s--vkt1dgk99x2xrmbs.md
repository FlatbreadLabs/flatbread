---
id: fnd-kelp-with-a-1-mb-dictionary-decodes-at-2-2-gb-s--vkt1dgk99x2xrmbs
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Kelp with a 1 MB dictionary decodes at 2.2 GB/s cold on Skiff
kind: measurement
created_at: '2026-02-03T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - fnd-kelp-decodes-at-1-1-gb-s-on-skiff-with-a-cold-ca--vef244qjn2mjf07x
superseded_by:
  - fnd-kelp-with-a-1-mb-dictionary-decodes-at-1-5-gb-s--y9v8jrxgbv6abrx5
---
Kenji Arakawa retrained Kelp's dictionary at 1 MB, which fits Skiff's cache next to the decode job. Cold on Skiff, Kelp now decodes at 2.2 GB/s, against 1.3 GB/s for Zstandard. The ratio drops from 3.1:1 to 2.9:1, which grows the install by about 7%.
