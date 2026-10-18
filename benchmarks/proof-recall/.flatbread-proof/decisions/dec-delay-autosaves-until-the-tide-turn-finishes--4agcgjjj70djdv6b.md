---
id: dec-delay-autosaves-until-the-tide-turn-finishes--4agcgjjj70djdv6b
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Delay autosaves until the tide turn finishes
state: accepted
created_at: '2026-05-08T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - fnd-3-of-200-saves-taken-mid-turn-fail-to-load--4j1kafsdeq0wedhf
---
An autosave requested during a tide turn waits until the turn's terrain changes finish, at most 40 seconds. Manual saves show a short "the tide is turning" notice and wait the same way.
