---
id: fnd-fixed-point-tide-step-costs-0-9-ms-on-skiff--mfc73bg9wwaxtfra
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Fixed-point tide step costs 0.9 ms on Skiff
kind: measurement
created_at: '2025-12-02T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - dec-run-the-tide-simulation-in-32-32-fixed-point--c5rjfcnmhne4h05e
---
One fixed-point tide step costs 0.9 ms on Skiff, against 0.4 ms for the old float step. Most of the extra time is 64-bit multiplies in the wave height field.
