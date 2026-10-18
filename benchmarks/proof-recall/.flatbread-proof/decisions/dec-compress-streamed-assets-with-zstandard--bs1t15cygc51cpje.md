---
id: dec-compress-streamed-assets-with-zstandard--bs1t15cygc51cpje
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Compress streamed assets with Zstandard
state: rejected
created_at: '2025-10-16T10:30:00Z'
created_by: Rhea Valdés
derives_from:
  - fnd-kelp-decodes-streamed-assets-at-2-9-gb-s-per-cor--32tjx83v8ky28sz4
  - iss-which-codec-should-compress-streamed-assets--9gnh870e1qwzd28r
rejected_by: dec-shrink-kelp-s-dictionary-to-1-mb-for-streamed-as--yh8hktfqnyqhepew
reopen_history:
  - at: '2026-01-15T10:00:00.000Z'
    reason: >-
      The Kelp benchmark that beat Zstandard ran with a warm cache; cold on
      Skiff, Zstandard is faster.
    rejected_by: dec-compress-streamed-assets-with-kelp--ezwc5p1tgsgm7v8m
---
Use Zstandard, an off-the-shelf codec with years of fuzzing and platform ports behind it. Rhea Valdés would rather not own a codec, even at half the decode speed.
