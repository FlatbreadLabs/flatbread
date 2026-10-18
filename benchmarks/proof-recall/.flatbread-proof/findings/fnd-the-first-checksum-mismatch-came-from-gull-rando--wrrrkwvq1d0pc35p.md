---
id: fnd-the-first-checksum-mismatch-came-from-gull-rando--wrrrkwvq1d0pc35p
effort: eff-co-op-rollback-netcode-prototype--n5ejm416kfcfap49
title: The first checksum mismatch came from Gull random number calls
kind: diagnosis
created_at: '2026-02-16T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - dec-hash-tide-physics-and-gull-state-every-30-frames--yqf2m6hqbjhwvkzq
---
The checksums caught a Gull script that seeded its random generator from wall-clock time. Fixed in a day. Tide and physics hashes have matched in every session since.
