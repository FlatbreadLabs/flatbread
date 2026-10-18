---
id: dec-compress-streamed-assets-with-kelp--ezwc5p1tgsgm7v8m
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Compress streamed assets with Kelp
state: accepted
created_at: '2025-10-16T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - fnd-kelp-decodes-streamed-assets-at-2-9-gb-s-per-cor--32tjx83v8ky28sz4
  - iss-which-codec-should-compress-streamed-assets--9gnh870e1qwzd28r
---
Use Kelp for every streamed asset class. It decodes twice as fast as Zstandard with a better ratio, and the studio owns the code, so console-specific tuning is in our hands.
