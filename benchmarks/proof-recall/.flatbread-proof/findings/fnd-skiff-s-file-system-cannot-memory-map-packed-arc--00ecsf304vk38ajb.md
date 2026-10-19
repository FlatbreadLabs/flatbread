---
id: fnd-skiff-s-file-system-cannot-memory-map-packed-arc--00ecsf304vk38ajb
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Skiff's file system cannot memory-map packed archives
kind: survey
created_at: '2025-09-26T10:00:00Z'
created_by: Priya Natarajan
derives_from:
  - iss-which-read-path-should-streaming-use-on-each-pla--v9wd5sxvfjfsgx9r
---
Priya Natarajan checked the platform SDKs. PC and Meridian can memory-map files. Skiff's file system maps only loose files under 64 MB, and the packed cell archives are several gigabytes. A mapped design would need a second read path for Skiff anyway.
