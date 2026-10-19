---
id: dec-save-full-world-snapshots--296ytcmq2f4kpahk
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Save full world snapshots
state: rejected
created_at: '2025-12-05T10:00:00Z'
created_by: Rhea Valdés
derives_from:
  - fnd-a-full-world-snapshot-save-is-310-mb--2c7a78gjb54ygkj4
  - iss-how-should-save-games-store-the-changing-world--kpdhcdkax56a7b7d
rejected_by: dec-save-player-changes-as-deltas-against-the-tide-f--n38scy1yaarsr8cw
---
Write the whole world state into each save. Simple, and a load needs no baseline data. Size can be cut later with compression.
