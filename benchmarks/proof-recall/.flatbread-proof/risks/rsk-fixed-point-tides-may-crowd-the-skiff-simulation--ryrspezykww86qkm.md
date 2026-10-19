---
id: rsk-fixed-point-tides-may-crowd-the-skiff-simulation--ryrspezykww86qkm
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Fixed-point tides may crowd the Skiff simulation budget
state: accepted
created_at: '2025-12-05T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - fnd-fixed-point-tide-step-costs-0-9-ms-on-skiff--mfc73bg9wwaxtfra
evidence:
  - fnd-fixed-point-tide-step-costs-0-9-ms-on-skiff--mfc73bg9wwaxtfra
likelihood: medium
severity: medium
---
At 0.9 ms per step, the tide costs more than twice its float price on Skiff. If other simulation work grows, the tide step could push frames over budget.
