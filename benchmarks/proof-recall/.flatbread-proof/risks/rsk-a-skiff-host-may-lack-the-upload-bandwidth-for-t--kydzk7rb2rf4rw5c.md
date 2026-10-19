---
id: rsk-a-skiff-host-may-lack-the-upload-bandwidth-for-t--kydzk7rb2rf4rw5c
effort: eff-co-op-rollback-netcode-prototype--n5ejm416kfcfap49
title: A Skiff host may lack the upload bandwidth for three clients
state: open
created_at: '2026-04-03T10:00:00Z'
created_by: Priya Natarajan
derives_from:
  - dec-use-host-authoritative-sync-for-co-op--17hqrmtja7pn98d6
likelihood: medium
severity: medium
---
With host-authoritative sync the host sends world state to every client. Priya Natarajan has not yet measured Skiff upload on home Wi-Fi, and a Skiff hosting three clients may not keep up. Nobody owns this now that the netcode Effort is stopping.
