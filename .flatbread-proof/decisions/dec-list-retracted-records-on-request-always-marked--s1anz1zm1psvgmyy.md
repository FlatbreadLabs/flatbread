---
id: dec-list-retracted-records-on-request-always-marked--s1anz1zm1psvgmyy
effort: eff-effort-graph-memory-and-agent-wedge--szeqvmgqjqnhd002
title: 'List retracted records on request, always marked'
state: accepted
created_at: '2026-10-18T20:20:07.119Z'
derives_from:
  - fnd-on-every-question-brief-cuts-reading-but-not-mis--9r1f6caywmytjr0w
---

Browse reads still hide retracted records by default. `proof records <effortId> --retracted only` lists an Effort's retracted records, and `--retracted include` lists them beside live ones.

A retracted record must never pass for a live one, so every digest marks it in three places: its index line ends in `(retracted)`, a **RETRACTED** banner with the date and reason sits under its heading, and the envelope summary counts `retracted N`. `get` carries the same banner.

Why: retraction keeps a record for audit, but no read could find one without already knowing its id, because Retract strips the id from every other record. In the recall benchmark, every run answered "unknown" to all eight questions about retracted records. With the flag, a rerun answered 7 of 8 in each strategy.

Revisit if agents start citing retracted records as live evidence despite the banner.
