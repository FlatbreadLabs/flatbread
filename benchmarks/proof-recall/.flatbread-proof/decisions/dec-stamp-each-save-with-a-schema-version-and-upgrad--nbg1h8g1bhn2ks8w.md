---
id: dec-stamp-each-save-with-a-schema-version-and-upgrad--nbg1h8g1bhn2ks8w
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Stamp each save with a schema version and upgrade it step by step on load
state: accepted
created_at: '2026-03-12T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - con-saves-from-beta-onward-must-load-in-every-later--v6z856sxtgc5sb09
  - dec-save-player-changes-as-deltas-keyed-to-the-tide--1qxvc9985c8pzke8
  - fnd-each-save-upgrade-step-costs-under-5-ms--qs1rweqqgj7kweem
---
Every save header carries a schema version number. Each format change adds one upgrade step that converts version N to N+1. On load, the game runs every step from the save's version to the current one, in order, before applying deltas.

Rules for steps: a step is a pure function of the old save; it never reads the current world data; and a step is never edited or deleted once a build that writes its input version has shipped to players.

Tide state is part of the versioned format. A change to the tide simulation's state, such as a new phase value, needs its own upgrade step that fills the new value for old saves.

The version counter starts at 1 with this decision. Each upgrade step must be covered by a golden save from the build that wrote its input version, kept in the save test corpus.
