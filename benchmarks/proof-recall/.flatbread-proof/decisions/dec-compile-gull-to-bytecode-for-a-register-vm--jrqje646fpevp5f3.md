---
id: dec-compile-gull-to-bytecode-for-a-register-vm--jrqje646fpevp5f3
effort: eff-kestrel-world-streaming-and-simulation-core--3evfpn88ghjnnfk4
title: Compile Gull to bytecode for a register VM
state: accepted
created_at: '2025-10-16T11:00:00Z'
created_by: Rhea Valdés
derives_from:
  - con-no-runtime-code-generation-on-consoles--6cf25zqmsvqkdd73
  - fnd-gull-s-tree-walking-interpreter-spends-1-8-ms-on--bj1ge76d3wy5aqq3
  - iss-should-gull-run-on-a-tree-walking-interpreter-or--dkfsjk9enx1myhff
supersedes:
  - dec-keep-gull-on-the-tree-walking-interpreter--br1kgzfmw57xmm9m
reopen_history:
  - at: '2026-01-16T10:00:00.000Z'
    reason: Alpha content needs three times the Gull tick budget on the interpreter.
    rejected_by: dec-keep-gull-on-the-tree-walking-interpreter--br1kgzfmw57xmm9m
---
Compile Gull to compact bytecode and run it on a register-based VM with no JIT, which the consoles forbid. Rhea Valdés expects a 3x to 5x speed-up over the interpreter. Hot reload needs new work: swapping compiled functions safely.
