---
id: fnd-a-rollback-snapshot-is-38-kb-per-player-per-fram--wa18f2emyakt0tgx
effort: eff-co-op-rollback-netcode-prototype--n5ejm416kfcfap49
title: A rollback snapshot is 38 KB per player per frame
kind: measurement
created_at: '2025-12-09T11:00:00Z'
created_by: Sofia Marchetti
derives_from:
  - dec-prototype-rollback-netcode-for-co-op--2tx2s2p3sfbwj8x4
cites:
  - cit-studio-wiki-primer-on-rollback-netcode--mktyz3g3cwfc7xa7
---
With player physics, Gull script state and the local tide cells included, one player's rollback snapshot is 38 KB per frame. A 4-frame ring for four players needs about 600 KB, which is fine on every platform.
