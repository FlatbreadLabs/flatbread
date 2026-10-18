---
id: fnd-skiff-dev-kit-firmware-blocks-the-gull-debugger--hjkc0v1fjd4qfxj4
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Skiff dev kit firmware blocks the Gull debugger port
kind: measurement
created_at: '2026-09-10T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - iss-the-gull-debugger-cannot-attach-on-skiff-dev-kit--84pppnx1wzwf33bz
---
The new Skiff dev kit firmware closes every inbound port except the platform's own debug service. The Gull debugger listens on its own port, so the attach never connects. Tunnelling through the platform debug service would work, but nobody has built it.
