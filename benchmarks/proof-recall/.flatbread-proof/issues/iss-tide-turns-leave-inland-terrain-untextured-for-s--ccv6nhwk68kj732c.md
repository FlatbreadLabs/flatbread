---
id: iss-tide-turns-leave-inland-terrain-untextured-for-s--ccv6nhwk68kj732c
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Tide turns leave inland terrain untextured for seconds
kind: blocker
status: open
created_at: '2026-08-11T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - fnd-tide-priority-reads-starve-player-proximity-load--by0d7b0bk39xz3rk
---
Untextured terrain during spring tides blocks content lock sign-off for the coast region. Streaming needs a read scheduler that serves both the tide deadline and the player.
