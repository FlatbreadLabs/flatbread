---
id: dec-use-twelve-github-topics-that-mix-demand-with-ra--67c632y486se7a9b
effort: eff-flatbread-product-branding--zt7b35sa05kyvhdz
title: Use twelve GitHub topics that mix demand with rankable niches
state: accepted
created_at: '2026-08-24T01:46:47.307Z'
derives_from:
  - fnd-github-topic-pages-only-rank-flatbread-in-small--0p910vppn6z2nd3m
---

Keep the GitHub About blurb **Context alignment, version controlled.** Put that same line on the README. Cut the live topic list from 20 implementation labels to 12 niches where Flatbread either already ranks, would rank at 64 stars, or is an honest demand filter for agent memory and file-based content.

Canonical list, About-sidebar order, stored in `.github/topics.json`:

1. `agent-memory`
2. `coding-agents`
3. `context-engineering`
4. `project-memory`
5. `context-management`
6. `agent-context`
7. `llm-memory`
8. `git-native`
9. `markdown-cms`
10. `git-cms`
11. `file-based-cms`
12. `docs-as-code`

Lead seven name the fragmented-context problem for coding agents. Trailing five name the Git/file publishing path (`markdown-cms` is already 1st of 13; `git-cms` is already 4th of 17; `file-based-cms` would be 2nd of 14).

Drop `ai-agents`, `markdown`, `javascript`, `typescript`, `nodejs`, `nextjs`, `yaml` (oceans), `graphql` / `graphql-codegen` (one read interface), `headless-cms` and `knowledge-graph` (true phrases, unwinnable pages), `agent-skills` (a skill is a channel, not the product), `local-first` / `knowledge-base` / `static-content` (wrong communities), and `mcp` / `rag` / `claude-code` (untrue).

GitHub does not read `.github/topics.json`. A repo admin applies it with `gh api -X PUT repos/FlatbreadLabs/flatbread/topics --input .github/topics.json`. npm `keywords` on the public `flatbread` package mirror the twelve, plus `markdown` and `knowledge-graph` for npm search.

## Alternatives considered

- **Handoff ten:** `ai-agents`, `agent-memory`, `agent-context`, `coding-agents`, `knowledge-graph`, `context-management`, `git-native`, `markdown`, `git-cms`, `headless-cms`. Rejected as-is: it drops `markdown-cms` (already 1st), skips `context-engineering` and `project-memory` / `file-based-cms` (rankable or high-demand), and keeps oceans `ai-agents` / `markdown` plus unwinnable `headless-cms` / `knowledge-graph`.
- **Keep all 20 current topics.** Rejected: GitHub caps at 20, so every ocean crowds out a niche we can actually win.
- **Only rankable tags** (`markdown-cms`, `git-cms`, `git-native`, `file-based-cms`, `agent-context`, `project-memory`). Rejected: people searching `agent-memory` never see the repo.
- **Change the tagline** to a longer two-path slogan. Rejected: the short line already names the problem; the README table explains the two paths.

## Reversal criteria

Revisit when stars cross a few hundred (demand-topic pages become reachable), when a new surface ships and a tag becomes true (MCP, hosted search), or when `markdown-cms` / `git-cms` stop matching how searchers name the publishing path.
