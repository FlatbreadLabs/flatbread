---
id: dec-keep-dags-acyclic-model-refinement-as-bounded-lo--9ptqq1ck3sax00fq
effort: eff-proof-and-contributor-operating-system--ahhgtafvdhg4dfve
title: Keep DAGs acyclic; model refinement as bounded loops
state: accepted
created_at: '2026-07-18T19:43:25.417Z'
---

## Context

Dependency edges express static causality, readiness, skip behavior, and
parallelism. Allowing cycles would make those properties ambiguous, while
review-and-refine workflows still need controlled repetition.

## Decision

Keep `depends_on` acyclic. Model research → critique → refine as declared,
bounded convergence loops in the DAG. A loop names its convergence task,
iteration ceiling, and either the ancestor cone or an explicit,
dependency-closed re-execution subset.

Multiple loops execute in declaration order, must have distinct convergence
tasks and disjoint re-execution sets, and cannot be combined with the legacy
`--converge-on` CLI flag. The CLI flag remains supported by synthesizing one
loop for ad-hoc use.

## Consequences

The existing blockers/high-severity-findings parser stays the v1 stop
predicate. Nested loops, alternate predicates, and cross-loop coordination
remain out of scope until concrete runtime demand exists. Existing DAG JSON
without loops remains valid.
