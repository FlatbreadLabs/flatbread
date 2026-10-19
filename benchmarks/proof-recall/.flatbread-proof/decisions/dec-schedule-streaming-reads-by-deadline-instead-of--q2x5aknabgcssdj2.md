---
id: dec-schedule-streaming-reads-by-deadline-instead-of--q2x5aknabgcssdj2
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Schedule streaming reads by deadline instead of fixed priority
state: proposed
created_at: '2026-08-14T10:00:00Z'
created_by: Kenji Arakawa
derives_from:
  - con-cell-load-deadline--m20x64m5eh7q2bh6
  - fnd-tide-priority-reads-starve-player-proximity-load--by0d7b0bk39xz3rk
  - iss-tide-turns-leave-inland-terrain-untextured-for-s--ccv6nhwk68kj732c
---
Give every read a deadline: tide cells get exposure time minus 8 seconds, proximity cells get the time the player will reach them at current speed. The queue serves the earliest deadline first. Tide reads with slack then yield to the player.
