---
id: iss-how-should-co-op-keep-up-to-four-players-in-sync--92t2zfsy3etfzr89
effort: eff-co-op-rollback-netcode-prototype--n5ejm416kfcfap49
title: How should co-op keep up to four players in sync?
kind: question
status: resolved
created_at: '2025-11-04T10:00:00Z'
created_by: Sofia Marchetti
resolved_by:
  - dec-use-host-authoritative-sync-for-co-op--17hqrmtja7pn98d6
---
Co-op needs a sync model before the vertical slice. Players fight, climb and ride the same tide surges, so any lag in shared state is visible. Candidates: rollback, deterministic lockstep, or a host-authoritative model.
