---
id: iss-which-codec-should-compress-streamed-assets--9gnh870e1qwzd28r
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Which codec should compress streamed assets?
kind: question
status: resolved
created_at: '2025-10-01T09:00:00Z'
created_by: Kenji Arakawa
resolved_by:
  - dec-compress-streamed-assets-with-kelp--ezwc5p1tgsgm7v8m
---
Streamed cells are compressed on disk and decoded on job workers. We can use Kelp, the studio's own codec, or an off-the-shelf codec. Decode speed per core matters more than ratio, because decode competes with simulation for workers during a tide turn.
