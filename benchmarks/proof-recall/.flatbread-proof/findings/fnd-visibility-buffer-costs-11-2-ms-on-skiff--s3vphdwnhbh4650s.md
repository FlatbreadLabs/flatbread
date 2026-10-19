---
id: fnd-visibility-buffer-costs-11-2-ms-on-skiff--s3vphdwnhbh4650s
effort: eff-lantern-renderer-overhaul--qwgke408pte4k0ar
title: Visibility buffer costs 11.2 ms on Skiff
kind: measurement
created_at: '2026-04-08T10:00:00Z'
created_by: Tomasz Brandt
derives_from:
  - dec-visibility-buffer-with-compute-material-resolve--5s2z9mqmv8vnszed
invalidated_by:
  - fnd-visibility-buffer-costs-7-4-ms-on-skiff-in-a-rel--fs86h16tm5hgempd
cites:
  - cit-capture-visibility-buffer-on-skiff--ymeda5m6p45hba8f
---
First Skiff devkit capture of the cliffs benchmark at 720p: the visibility buffer path costs 11.2 ms, against forward+'s 8.9 ms. Material resolve alone is 5.0 ms. Skiff's memory bandwidth looks like the limit, since every resolve fetch goes through the bindless material tables.
