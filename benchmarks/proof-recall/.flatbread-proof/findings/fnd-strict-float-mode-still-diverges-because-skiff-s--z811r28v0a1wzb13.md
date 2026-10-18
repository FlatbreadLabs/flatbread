---
id: fnd-strict-float-mode-still-diverges-because-skiff-s--z811r28v0a1wzb13
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Strict float mode still diverges because Skiff's sin() differs by one ulp
kind: measurement
created_at: '2025-11-04T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - dec-force-strict-ieee-float-mode-for-the-tide-simula--ecwmqt7ncjngysqw
---
With strict flags on every platform, PC against Meridian now matches for 2 hours. PC against Skiff still drifts past 1 cm at minute 11, because Skiff's math library returns a sin() that differs by one ulp for some inputs. Strict mode fixes the compiler, not the library.
