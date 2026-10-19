---
id: fnd-kelp-with-a-1-mb-dictionary-decodes-at-1-5-gb-s--y9v8jrxgbv6abrx5
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: >-
  Kelp with a 1 MB dictionary decodes at 1.5 GB/s cold on Skiff after firmware
  3.2
kind: measurement
created_at: '2026-09-02T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - dec-shrink-kelp-s-dictionary-to-1-mb-for-streamed-as--yh8hktfqnyqhepew
supersedes:
  - fnd-kelp-with-a-1-mb-dictionary-decodes-at-2-2-gb-s--vkt1dgk99x2xrmbs
---
Skiff firmware 3.2 shrank the cache share given to game cores. Cold on Skiff, Kelp with the 1 MB dictionary now decodes at 1.5 GB/s, down from 2.2 GB/s. Zstandard dropped from 1.3 to 1.2 GB/s. Kelp still wins, by 1.25x instead of 1.7x.
