# Performant context search research (2026)

This folder documents how [`flatbread-search-and-memory-research.md`](../../../../../../flatbread-search-and-memory-research.md) (repo root) was produced and where to find evidence **from a fresh clone**.

## Methodology

The report was authored using a **`/proof` DAG**: parallel subagents produced intermediate dossiers (repository audits + literature surveys), then synthesis tasks merged them into the single markdown file at the repo root.

The intermediate filenames below name that pipeline only — **they are not checked into git** (doing so would duplicate hundreds of kilobytes already folded into the report and §13 references):

- `audit-flatbread-retrieval.md`, `audit-proof-context.md`
- `sota-dense-sparse-hybrid.md`, `sota-graph-structure.md`, `sota-agent-memory.md`, `sota-embeddable-runtimes.md`
- `synthesis-flatbread.md`, `synthesis-proof.md`, `synthesis-novel.md`

**Canonical sources for readers:** [`flatbread-search-and-memory-research.md`](../../../../../../flatbread-search-and-memory-research.md), its inline citations into this repo (`packages/core`, `packages/proof`, …), and the external URLs in **§13 — References**.

## Proof run artifacts

When reproducing or extending this research with `@flatbread/oven`, full DAG runs write per-task transcripts under **`<cwd>/.oven/artifacts/`** by default. See the [Oven README](https://github.com/FlatbreadLabs/oven#readme) (`--full-output-dir`, `--no-artifacts`).
