---
id: con-co-op-peers-must-agree-on-tide-state-bit-for-bit--4v0sdbc3t4ywzr3g
effort: eff-co-op-rollback-netcode-prototype--n5ejm416kfcfap49
title: Co-op peers must agree on tide state bit for bit
kind: hard
created_at: '2025-11-05T10:00:00Z'
created_by: Rhea Valdés
---
Tides decide which saltglass paths are walkable. If two peers disagree on the water line by a single cell, one player walks on sand that another sees as sea. Rhea Valdés requires tide state to match exactly on every peer, whatever sync model co-op uses.
