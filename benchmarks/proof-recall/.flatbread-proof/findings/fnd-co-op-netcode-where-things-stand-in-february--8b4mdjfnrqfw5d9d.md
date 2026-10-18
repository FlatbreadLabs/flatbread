---
id: fnd-co-op-netcode-where-things-stand-in-february--8b4mdjfnrqfw5d9d
effort: eff-co-op-rollback-netcode-prototype--n5ejm416kfcfap49
title: 'Co-op netcode: where things stand in February'
kind: compaction
created_at: '2026-02-18T16:00:00Z'
created_by: Sofia Marchetti
derives_from:
  - dec-hash-tide-physics-and-gull-state-every-30-frames--yqf2m6hqbjhwvkzq
  - dec-prototype-rollback-netcode-for-co-op--2tx2s2p3sfbwj8x4
  - dec-use-a-6-frame-rollback-window-with-1-frame-of-in--s53944zhkw103frk
  - fnd-a-rollback-snapshot-is-38-kb-per-player-per-fram--wa18f2emyakt0tgx
  - fnd-rollback-re-simulates-a-4-frame-window-in-1-1-ms--xa30a1cez2brphyf
  - fnd-two-player-rollback-co-op-ran-the-vertical-slice--p51cfe0dn47vfkya
  - iss-late-join-during-a-tide-surge-desyncs-the-joinin--mya93va0n7s8g7cj
  - rsk-re-simulation-cost-could-blow-the-skiff-frame-bu--sk2njsp170a3qwyf
covers:
  - con-co-op-must-stay-playable-at-150-ms-round-trip--q330d4g95q7jtt4q@live
  - con-co-op-peers-must-agree-on-tide-state-bit-for-bit--4v0sdbc3t4ywzr3g@live
  - >-
    dec-hash-tide-physics-and-gull-state-every-30-frames--yqf2m6hqbjhwvkzq@accepted
  - dec-prototype-rollback-netcode-for-co-op--2tx2s2p3sfbwj8x4@accepted
  - >-
    dec-use-a-6-frame-rollback-window-with-1-frame-of-in--s53944zhkw103frk@accepted
  - fnd-a-rollback-snapshot-is-38-kb-per-player-per-fram--wa18f2emyakt0tgx@live
  - fnd-lockstep-playtest-at-150-ms-round-trip--hjp498j88mtdbnhs@live
  - fnd-one-frame-of-input-delay-is-invisible-in-playtes--azn8kxedq3pp1vq0@live
  - fnd-rollback-re-simulates-a-4-frame-window-in-1-1-ms--xa30a1cez2brphyf@live
  - fnd-skiff-co-op-sessions-over-wi-fi-see-180-ms-round--4ttevy0e2zfjqw18@live
  - fnd-the-first-checksum-mismatch-came-from-gull-rando--wrrrkwvq1d0pc35p@live
  - fnd-two-player-rollback-co-op-ran-the-vertical-slice--p51cfe0dn47vfkya@live
  - iss-how-should-co-op-keep-up-to-four-players-in-sync--92t2zfsy3etfzr89@open
  - iss-late-join-during-a-tide-surge-desyncs-the-joinin--mya93va0n7s8g7cj@open
  - rsk-re-simulation-cost-could-blow-the-skiff-frame-bu--sk2njsp170a3qwyf@open
---
Rollback is the chosen co-op sync model; lockstep was rejected after the 150 ms playtest. The window is 6 frames with 1 frame of input delay, which covers p95 Skiff Wi-Fi. Measured rollback cost is 1.1 ms for 4 frames on PC, so a 6-frame rollback should stay under 2 ms. Desync checksums work. Open: late join during a tide surge, and the Risk that tide re-simulation costs more once tides join the snapshot. Next: profile on Skiff with tides running, then plan for alpha.
