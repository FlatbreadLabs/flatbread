---
id: iss-beta-saves-lack-the-second-tide-harmonic-s-phase--gmhrjdy35pjfq651
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Beta saves lack the second tide harmonic's phase
kind: blocker
status: open
created_at: '2026-07-14T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - con-saves-from-beta-onward-must-load-in-every-later--v6z856sxtgc5sb09
  - dec-add-a-second-tide-harmonic-for-spring-and-neap-t--1c3s7dtyxvj70gvw
---
The second tide harmonic adds a phase value to the tide state. Beta saves do not have it, and every tide-keyed delta in them was made against a one-harmonic tide. Loading a beta save in the current build replays the deltas against different terrain. Beta saves must load, so this blocks the release candidate.
