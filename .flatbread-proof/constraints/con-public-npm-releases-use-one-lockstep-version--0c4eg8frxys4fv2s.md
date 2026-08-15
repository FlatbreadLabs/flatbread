---
id: con-public-npm-releases-use-one-lockstep-version--0c4eg8frxys4fv2s
effort: eff-proof-and-contributor-operating-system--ahhgtafvdhg4dfve
title: Public npm releases use one lockstep version
kind: hard
created_at: '2026-08-15T23:14:13.605Z'
---

Every public package in the Flatbread monorepo must declare the same version before any package in a release is published. The bump command updates all public package manifests in one operation, and the publish preflight must reject missing or mixed versions before it calls npm publish.
