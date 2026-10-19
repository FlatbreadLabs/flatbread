---
id: con-no-runtime-code-generation-on-consoles--6cf25zqmsvqkdd73
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: No runtime code generation on consoles
kind: hard
created_at: '2025-10-07T10:00:00Z'
created_by: Priya Natarajan
---
Meridian and Skiff never grant game processes writable executable memory. Nothing may generate machine code at run time on consoles: no JIT compilers, no runtime-patched code. PC builds may, but shipping one code path is preferred.
