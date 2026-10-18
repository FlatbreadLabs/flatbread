---
id: fnd-tide-locked-jitter-halves-caustic-flicker-but-st--nck1ftqr38v01cq1
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Tide-locked jitter halves caustic flicker but stalls caustic motion
kind: measurement
created_at: '2026-05-20T10:00:00Z'
created_by: Yusuf Demir
derives_from:
  - dec-lock-caustic-photon-jitter-to-the-tide-phase--85x10k4h11t8nx7c
---
Yusuf Demir built the tide-locked seed on the r6600 branch and ran the dunes noon trace again. Peak flicker energy in the 3 to 6 Hz band drops by about half. It does not go away, because Tern still sees sub-pixel photon positions change between tide steps.

The bigger problem is motion. Caustics are supposed to crawl with the water, and the tide only moves the pattern when the phase advances. Around slack water the phase barely moves, so the caustics stand still while the water surface keeps rippling. Reviewers in the art meeting called it frozen. Yusuf Demir tried adding a slow drift on top of the tide seed, and the flicker came straight back.

Around slack tide the caustic pattern freezes for about 4 minutes of each 40-minute cycle.
