# 0007 — Agent read shim

Status: Accepted

## Context

Agents querying the Effort Graph through MCP tools or the SDK must not dump whole reasoning graphs into their context window. The first planned agent-facing read surface is `blockingDecisions(effortId)` (roadmap). ADR-0003 defined generation tokens and opt-in strict reads.

## Decision

Every read tool returns a bounded envelope. The response is navigation; the rendered markdown file is the evidence. Reading it costs the agent one Read tool call, and it can be grepped:

```json
{
  "summary": "2 results; 1 accepted, 1 proposed; complete",
  "artifact_path": ".flatbread/effort-graph/read-cache/42/abc123.md",
  "artifact_sha256": "…",
  "served_generation": "…",
  "consistency": { "mode": "eventual", "min_generation": null },
  "page": { "returned": 2, "has_more": false, "next_cursor": null },
  "hints": ["getRecord(\"dec-…\")"]
}
```

`summary` is deterministic and at most 160 tokens, covering result count, material states, and truncation. `hints` contains at most 10 executable follow-up query calls, not prose. Digests are written atomically to `.flatbread/effort-graph/read-cache/<served-generation>/<canonical-query-hash>.md` (gitignored). Generation in the path prevents a stale projection from being served under a current-looking filename; identical query and generation reuse the cached file. On startup or `flatbread effort cache prune`, prune files older than 24 hours and enforce a 100 MiB ceiling, oldest first.

Each digest contains a query header (query, served generation, result counts, completeness), an index of anchor links, per-record sections with selected frontmatter, normalized relation lists, and a bounded body excerpt (600 characters / 12 lines), plus an explicit edge table. Full bodies are never inlined; `getRecord(id)` renders a single-record digest.

V1 caps are 25 primary records, one-hop relation expansion, 50 displayed edges, and a 64 KiB digest. At any cap the digest is marked incomplete and returns an opaque cursor. Scope and body length never silently expand.

Every response echoes `served_generation`. Reads are eventual by default. Strict callers pass `{consistency: {mode: "strict", min_generation: "<token>"}}`; the server waits for the projection to reach that generation or returns an explicit consistency error, never a stale result labelled strict. Generation tokens are opaque to clients.

Use one shared read/query-render layer for MCP and CLI: query projection → bounded result model → digest renderer/cache writer. MCP is a thin transport adapter, so agent and human read semantics cannot diverge.

V1 supports effort-scoped structured predicates, known relation traversal, pagination, record lookup, generation-aware reads, and `blockingDecisions(effortId)`. Defer semantic or embedding search, cross-effort traversal, arbitrary graph queries, rendering templates, durable query artifacts, and cross-machine cache sync.

## Consequences

- `blocking decision` needs a precise definition against the current edge vocabulary before implementation.
- Caps should be re-benchmarked in tokens against real Efforts.
- The cache directory must be added to gitignore when implemented.
