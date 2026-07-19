# Effort Graph Visualization (Next.js + R3F)

Next.js example that dogfoods the monorepo's Effort Graph content at
`.flatbread-efforts`. It renders an interactive 2D force-directed graph with
`@react-three/fiber`, subscribes to Flatbread live schema generations over SSE,
and ships a Vercel-like light/dark UI shell.

## Prerequisites

From the **monorepo root**:

```bash
pnpm install
pnpm build
```

Build workspace packages (especially `flatbread`) before starting the example.
The dev script wraps `flatbread start --watch`, which needs compiled package
output.

## Quick start

```bash
pnpm --filter effort-viz dev
```

From the repo root you can also use the convenience alias:

```bash
pnpm play:efforts
```

Then open **[http://localhost:3000](http://localhost:3000)**.

Flatbread serves GraphQL at **`http://localhost:5057/graphql`**. The app
subscribes to **`http://localhost:5057/events`** (SSE) for schema generation
updates.

## What you get

- **Live graph** — `useEffortGraphLive` opens an `EventSource` on `/events`.
  On `ready` and each `generation` event it refetches the Effort Graph query and
  updates the canvas. The status pill shows connecting / live / disconnected and
  the current generation.
- **Watch mode** — `flatbread start --watch` reloads content and config changes
  under `.flatbread-efforts`. Edit an effort, issue, or finding file and the
  graph animates in/out without restarting Next.
- **R3F canvas** — orthographic 2D scene with pan/zoom, node labels, edge
  “veins”, spawn/retract physics, and a detail drawer on node click.
- **Theme** — sun/moon toggle in the top bar; preference persists in
  `localStorage` (`effort-viz-theme`) with a boot script to avoid FOUC.

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm --filter effort-viz dev` | `flatbread start --watch` + Next dev (Turbopack). GraphQL on **5057**, Next on **3000**. |
| `pnpm play:efforts` | Same as `dev`, from the monorepo root. |
| `pnpm --filter effort-viz build` | `flatbread start` wrapping `next build` (Flatbread must be up during the build). |
| `pnpm --filter effort-viz start` | Production Next only (`next start`); run Flatbread separately if needed. |
| `pnpm --filter effort-viz test` | Physics/simulation unit tests under `lib/physics/`. |
| `pnpm --filter effort-viz exec tsc --noEmit` | Typecheck without running dev servers. |

## Configuration

- `flatbread.config.js` — loads effort graph collections from
  `../../.flatbread-efforts` via `effortGraphContent()`.
- `lib/graphql.ts` — `graphqlFetch` helper (default endpoint
  `http://localhost:5057/graphql`).
- `lib/useEffortGraphLive.ts` — SSE subscription + GraphQL refetch loop.

## Project structure

- `app/` — layout, theme tokens, R3F canvas and UI chrome
- `app/hooks/useTheme.tsx` — light/dark context + FOUC boot script
- `app/components/` — `EffortGraphApp`, `GraphCanvas`, `TopBar`, `Legend`,
  `DetailDrawer`
- `lib/physics/` — force simulation, growth, and layout helpers
- `lib/query.ts` — Effort Graph GraphQL query
- `flatbread.config.js` — Effort Graph content preset

## Troubleshooting

### Empty graph or “Connecting” forever

Ensure Flatbread is running on port **5057**. Use `pnpm --filter effort-viz dev`
(or `pnpm play:efforts`), not `next dev` alone.

### Typecheck / build

```bash
pnpm build
pnpm --filter effort-viz exec tsc --noEmit
pnpm --filter effort-viz build
```

Production build starts Flatbread briefly so Next can typecheck; you may see a
non-fatal ESLint config warning from the root toolchain — the build still
completes.
