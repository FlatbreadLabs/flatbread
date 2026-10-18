---
id: dec-re-simulate-tides-at-quarter-resolution-during-r--7ah25p0r0xt9719f
effort: eff-co-op-rollback-netcode-prototype--n5ejm416kfcfap49
title: Re-simulate tides at quarter resolution during rollback
state: rejected
created_at: '2026-03-24T10:00:00Z'
created_by: Sofia Marchetti
derives_from:
  - fnd-re-running-tides-every-rollback-frame-costs-4-8--tp4gxe8prh0bh9h4
rejected_by: dec-abandon-rollback-netcode-for-co-op--46envrg0v4pdwv7b
---
Keep rollback, but re-run tides on a quarter-resolution grid for rolled-back frames and correct to full resolution afterwards. This would cut tide re-simulation to about 1.2 ms. Rhea Valdés doubts the correction step can stay bit-exact.
