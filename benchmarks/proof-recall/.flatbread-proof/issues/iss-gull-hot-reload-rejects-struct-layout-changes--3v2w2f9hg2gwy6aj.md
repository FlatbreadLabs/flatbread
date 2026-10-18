---
id: iss-gull-hot-reload-rejects-struct-layout-changes--3v2w2f9hg2gwy6aj
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Gull hot reload rejects struct layout changes
kind: gap
status: deferred
created_at: '2026-02-16T10:00:00Z'
created_by: Marta Lindqvist
derives_from:
  - dec-compile-gull-to-bytecode-for-a-register-vm--jrqje646fpevp5f3
resolved_by:
  - dec-hot-reload-gull-functions-by-swapping-bytecode-a--8dxnkg6h8vmcsr42
---
With bytecode, live objects have a fixed layout. An edit that adds or removes a field in a Gull struct cannot be applied to objects that already exist, so the editor refuses the reload.
