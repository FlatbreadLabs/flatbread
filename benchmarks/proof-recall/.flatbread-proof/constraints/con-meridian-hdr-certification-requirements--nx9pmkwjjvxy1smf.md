---
id: con-meridian-hdr-certification-requirements--nx9pmkwjjvxy1smf
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Meridian HDR certification requirements
kind: hard
created_at: '2025-11-18T10:00:00Z'
created_by: Priya Natarajan
---
Meridian certification runs an HDR test pass on every submission, and a failure blocks release. Priya Natarajan summarized the parts that touch Lantern. The game must read the display peak luminance from the system calibration and never exceed it, so a curve that assumes a fixed peak fails on dimmer panels. The 10,000-nit test ramp must not clip below the calibrated peak. The game must start in HDR when the system is in HDR, without asking. The user must be able to choose paper white anywhere from 80 to 400 nits, and the game must start from the system paper-white value on first boot.

Black level must follow the system setting as well; crushing the bottom 1 percent of the ramp is a failure. The test also checks that SDR and HDR screenshots match in content, so the HDR path cannot hide or add effects.

A title may fail the HDR pass at most twice per release candidate; a third failure sends the whole submission back for a full re-review.
