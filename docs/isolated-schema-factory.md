# Isolated schema factory

`generateSchema` now creates a new GraphQL composer and schema for every build. A returned schema therefore owns the resolver closures for that build’s content snapshot; a later build cannot replace its types, fields, or reads.

We removed the config-keyed schema cache after applying the deletion test. Deleting it removed more complexity than it exposed: the cache keyed schemas from configuration while resolver closures captured content from the first build, producing stale reads after content changed. It also required validation-before-cache ordering and forced the Next.js watch demo to add a `__demoCacheBust` field solely to avoid a cache hit.

The process-global composer was a separate shared-state issue. Per-build composers isolate type registration and make schemas independently usable; this is not evidence that a schema cache is needed. Because `graphql-compose-json` registers nested object types on the global composer even when given a composer instance, core now owns a small JSON→type parser that threads the per-build composer through every recursion while reproducing the upstream semantics and type naming exactly. AVA remains configured with concurrency `1` until a follow-up validates parallel safety across the complete test suite.

We did not re-key the cache by content-snapshot identity. There is no profiling evidence that schema construction is the dominant cost in a relevant workload, while a content-keyed cache would add identity, eviction, and lifecycle complexity without demonstrated leverage. If profiling later proves a need, introduce a measured cache behind an explicit seam with correctness tests for changing content.
