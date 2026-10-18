---
id: rsk-re-simulation-cost-could-blow-the-skiff-frame-bu--sk2njsp170a3qwyf
effort: eff-co-op-rollback-netcode-prototype--n5ejm416kfcfap49
title: >-
  Re-simulation cost could blow the Skiff frame budget once tides join the
  snapshot
state: realized
created_at: '2026-01-20T10:00:00Z'
created_by: Sofia Marchetti
derives_from:
  - dec-use-a-7-frame-rollback-window--ewptan6y616adtfw
  - fnd-rollback-re-simulates-a-4-frame-window-in-1-1-ms--xa30a1cez2brphyf
evidence:
  - fnd-re-running-tides-every-rollback-frame-costs-4-8--tp4gxe8prh0bh9h4
likelihood: medium
severity: high
---
Every prototype number so far ran with tides frozen. Once tides are in the snapshot, every rolled-back frame re-runs the tide step too. Sofia Marchetti does not yet know what one tide step costs on Skiff.
