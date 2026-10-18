---
id: dec-lock-caustic-photon-jitter-to-the-tide-phase--85x10k4h11t8nx7c
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Lock caustic photon jitter to the tide phase
state: proposed
created_at: '2026-03-03T10:00:00Z'
created_by: Yusuf Demir
derives_from:
  - iss-caustics-flicker-under-tern-at-low-internal-reso--he94mq6rr7tr5yv5
---
Seed the photon jitter from the tide phase instead of the frame number, so the pattern changes only as the water moves. Tern then sees a stable pattern between tide steps.
