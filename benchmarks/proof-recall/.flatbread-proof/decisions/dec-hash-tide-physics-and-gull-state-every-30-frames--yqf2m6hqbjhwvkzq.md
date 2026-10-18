---
id: dec-hash-tide-physics-and-gull-state-every-30-frames--yqf2m6hqbjhwvkzq
effort: eff-co-op-rollback-netcode-prototype--n5ejm416kfcfap49
title: 'Hash tide, physics and Gull state every 30 frames and compare across peers'
state: accepted
created_at: '2026-02-11T10:00:00Z'
created_by: Sofia Marchetti
derives_from:
  - iss-nothing-shows-which-system-caused-a-desync--k7w6rvkptez9d48k
---
Each peer hashes the three state blocks separately every 30 frames and sends 12 bytes to the others. A mismatch names the block that diverged and the frame window it happened in.
