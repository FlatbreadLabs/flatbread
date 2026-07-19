---
id: dec-use-isolated-schema-factories-without-a-cache--8bn823dg29yfvbzv
effort: eff-local-runtime-and-ownership-loop--g28gfbb0kdrnpe2t
title: Use isolated schema factories without a cache
state: accepted
created_at: '2026-07-18T19:42:17.673Z'
derives_from:
  - fnd-schemas-need-per-build-isolation--vdjfmtqb0dbjfcqk
---

## Context

A configuration-keyed schema cache reused resolver closures captured from the
first content snapshot, producing stale reads after content changed. It also
required validation-before-cache ordering and forced the watch demo to carry a
cache-busting field.

## Decision

Create a GraphQL composer and schema for every build. Each returned schema owns
its resolver closures and content snapshot. Keep per-build composers isolated,
and retain the owned JSON-to-type parser because the upstream JSON composer
leaks nested types onto a global composer even when passed an instance.

Do not add a content-keyed cache without profiling evidence, an explicit seam,
and correctness tests for changing content.

## Consequences

Schema construction is simpler and correct under rebuilds. AVA remains
serialized until complete-suite parallel safety is demonstrated. A measured
cache may return only after it shows meaningful leverage without recreating
snapshot-lifetime coupling.
