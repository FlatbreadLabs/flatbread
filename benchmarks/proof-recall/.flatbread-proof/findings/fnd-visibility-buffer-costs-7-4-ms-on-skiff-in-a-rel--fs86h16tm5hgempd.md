---
id: fnd-visibility-buffer-costs-7-4-ms-on-skiff-in-a-rel--fs86h16tm5hgempd
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Visibility buffer costs 7.4 ms on Skiff in a release build
kind: measurement
created_at: '2026-06-22T10:00:00Z'
created_by: Tomasz Brandt
invalidates:
  - fnd-visibility-buffer-costs-11-2-ms-on-skiff--s3vphdwnhbh4650s
---
The April Skiff capture ran with GPU validation on, which roughly doubles the cost of every bindless fetch. In a release build the cliffs benchmark visibility buffer path costs 7.4 ms against forward+ at 8.1 ms, at 720p. With material resolve at half rate the visibility buffer path is 6.3 ms. The April number should not have driven a Decision.
