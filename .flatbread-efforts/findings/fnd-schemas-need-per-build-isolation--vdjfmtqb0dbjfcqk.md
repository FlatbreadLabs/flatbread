---
id: fnd-schemas-need-per-build-isolation--vdjfmtqb0dbjfcqk
effort: eff-local-runtime-and-ownership-loop--g28gfbb0kdrnpe2t
title: Schemas need per-build isolation
kind: retrospective
created_at: '2026-07-18T19:42:15.139Z'
---

A fresh composer/schema per build prevents resolver closures from reading a prior content snapshot.
