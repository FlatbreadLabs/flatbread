---
id: dec-use-a-6-frame-rollback-window-with-1-frame-of-in--s53944zhkw103frk
effort: eff-co-op-rollback-netcode-prototype--n5ejm416kfcfap49
title: Use a 6-frame rollback window with 1 frame of input delay
state: accepted
created_at: '2026-02-02T10:00:00Z'
created_by: Sofia Marchetti
derives_from:
  - fnd-one-frame-of-input-delay-is-invisible-in-playtes--azn8kxedq3pp1vq0
  - fnd-rollback-re-simulates-a-4-frame-window-in-1-1-ms--xa30a1cez2brphyf
  - fnd-skiff-co-op-sessions-over-wi-fi-see-180-ms-round--4ttevy0e2zfjqw18
supersedes:
  - dec-use-a-7-frame-rollback-window--ewptan6y616adtfw
---
Add 1 frame of local input delay, which playtesters cannot see, and shrink the window to 6 frames. Together they still cover p95 Skiff Wi-Fi. Scaling the 1.1 ms measurement, a 6-frame rollback should cost under 2 ms.
