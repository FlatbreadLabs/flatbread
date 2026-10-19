---
id: dec-visibility-buffer-on-all-platforms-skiff-resolve--k1ackk3c3275r5y1
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Visibility buffer on all platforms; Skiff resolves materials at half rate
state: accepted
created_at: '2026-07-08T10:00:00Z'
created_by: Ines Okafor
derives_from:
  - fnd-visibility-buffer-costs-7-4-ms-on-skiff-in-a-rel--fs86h16tm5hgempd
supersedes:
  - dec-visibility-buffer-on-pc-and-meridian-forward-fal--khvgysnhmnkjqe9k
---
Skiff returns to the visibility buffer. The release-build capture puts it at 7.4 ms against 8.1 ms for forward+, and at 6.3 ms with material resolve at half rate, so the forward+ fallback is no longer worth keeping.

On Skiff, material resolve shades every other pixel in a checkerboard and Tern fills the gaps from history. PC and Meridian resolve at full rate. Saltglass still renders in a forward pass after the resolve on every platform, because refraction needs the resolved scene behind it. The ports team has signed off on the half-rate look on the handheld screen; Yusuf Demir saw no difference on foliage and a slight softening on cliff detail.

Keeping two opaque paths cost one engineer-week a month in fixes. The Skiff forward+ path will be deleted from the codebase on 2026-07-24, after one week of nightly captures confirm the half-rate numbers.
