---
id: fnd-two-compiler-builds-with-the-same-version-string--gmgr4ha0ndxqmcn9
effort: eff-shader-compile-cache-and-build-farm--6xeac11zxvwwarkn
title: Two compiler builds with the same version string emit different bytecode
kind: defect
created_at: '2026-01-12T11:00:00Z'
created_by: Liam O'Connell
derives_from:
  - dec-recompile-a-1-in-50-sample-of-cache-hits-and-com--9n176hnc9w0tax3s
cites:
  - cit-shader-compiler-release-notes-for-build-1-8-2407--j9egrx9rnpp9ne9x
---
Agents 3 and 8 both report shader compiler version 1.8.2407, but agent 8 runs a hotfix build with a different optimizer. The byte-compare check from the sampling Decision flagged 14 mismatched water shader permutations in one week. Hashing the version string is not enough: the key must hash the compiler binary itself.
