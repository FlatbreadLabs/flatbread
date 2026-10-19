---
id: dec-transpile-gull-to-c-at-build-time--ytm47gyt6x8j6xx7
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Transpile Gull to C++ at build time
state: rejected
created_at: '2026-01-19T10:00:00Z'
created_by: Liam O'Connell
derives_from:
  - fnd-alpha-content-needs-6-2-ms-of-gull-time-per-fram--4mekgdpsdv5nk085
rejected_by: dec-compile-gull-to-bytecode-for-a-register-vm--jrqje646fpevp5f3
---
Liam O'Connell proposes translating Gull scripts to C++ during the build. Native speed, and no runtime code generation. The cost: every script edit needs a rebuild, so hot reload is gone, and build times grow by about 6 minutes.
