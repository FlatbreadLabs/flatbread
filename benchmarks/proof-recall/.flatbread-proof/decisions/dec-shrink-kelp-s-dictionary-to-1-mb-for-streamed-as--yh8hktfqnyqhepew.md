---
id: dec-shrink-kelp-s-dictionary-to-1-mb-for-streamed-as--yh8hktfqnyqhepew
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Shrink Kelp's dictionary to 1 MB for streamed assets
state: accepted
created_at: '2026-02-06T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - dec-compress-streamed-assets-with-kelp--ezwc5p1tgsgm7v8m
  - fnd-kelp-with-a-1-mb-dictionary-decodes-at-2-2-gb-s--vkt1dgk99x2xrmbs
---
Keep Kelp and ship the 1 MB dictionary on every platform. Cold on Skiff it beats Zstandard by 1.7x. The reopened Zstandard option is closed again by this decision.
