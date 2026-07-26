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

## What you can read off it

Within a few seconds of opening the page you should be able to answer:

- **What kinds of records are here?** Every primitive has its own hue *and* its
  own silhouette — Issues are amber diamonds, Findings blue circles, Decisions
  violet squares, Constraints teal hexagons, Risks red triangles, and each
  Effort is a ring whose core carries that cluster's tint.
- **What is still live, and what got overturned?** Rejected, superseded,
  invalidated, and won't-fix records fade to a desaturated ghost with a
  struck-through label. Supersession is derived from the graph's edges rather
  than from frontmatter, because forward edges are the authoritative
  representation and `state` can lag behind them — a Decision replaced through
  an inline `supersedes` still records `state: accepted`, so reading the field
  alone would label retired reasoning as committed.
- **What is blocking?** Open Issues with `kind: blocker` wear an amber warning
  outline.
- **How much work is tracked?** The header counts primitives and lifecycle
  (`5 Efforts · 4 open Issues · 3 proposed Decisions`) rather than nodes and
  edges — roughly half the "edges" are synthesised membership spokes, so a raw
  edge count flatters the graph without informing anyone.

## Encoding notes

Hue belongs to the **primitive**, not the Effort. Effort membership is already
carried by three other channels — the force layout pulls same-Effort records to
a shared centroid, each cluster has a large labelled hub, and membership spokes
take the cluster's tint — so spending the strongest nominal channel on it left
record kind with nothing. Shape repeats hue as a colour-vision backstop, since
amber/red and blue/violet partially merge under deuteranopia. Silhouettes are
area-normalized (`lib/glyphs.ts`) so a triangle and a square read at the same
visual weight; otherwise size would imply an importance ranking nobody
intended.

The legend derives its swatches from the same outlines and palette the canvas
builds geometry from (`lib/glyphs.ts`, `lib/primitives.ts`), so it cannot drift
from the render, and it only lists the relations the current generation actually
contains.

## Other features

- **Live graph** — `useEffortGraphLive` opens an `EventSource` on `/events`.
  On `ready` and each `generation` event it refetches the Effort Graph query and
  updates the canvas. The status pill shows connecting / live / disconnected and
  the current generation.
- **Watch mode** — `flatbread start --watch` reloads content and config changes
  under `.flatbread-efforts`. Edit an Effort, Issue, or Finding file and the
  graph animates in/out without restarting Next.
- **R3F canvas** — orthographic 2D scene with pan/zoom, cluster labels, edge
  “veins”, spawn/retract physics, and a detail drawer on record click.
- **Keyboard** — Tab to the canvas, then arrow keys to walk records in a stable
  Effort-then-primitive order, Enter to open the drawer, Escape to close. The
  camera follows focus and each move is announced to screen readers. The canvas
  itself is still a WebGL surface, so this is a focus proxy rather than a full
  DOM mirror of the graph.
- **Reduced motion** — `prefers-reduced-motion` settles the layout and finishes
  every growth animation before the first paint, and the camera snaps instead
  of easing.
- **Theme** — sun/moon toggle in the top bar. The app follows
  `prefers-color-scheme` until you pick a mode, after which the choice persists
  in `localStorage` (`effort-viz-theme`) with a boot script to avoid FOUC.

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm --filter effort-viz dev` | `flatbread start --watch` + Next dev (Turbopack). GraphQL on **5057**, Next on **3000**. |
| `pnpm play:efforts` | Same as `dev`, from the monorepo root. |
| `pnpm --filter effort-viz build` | `flatbread start` wrapping `next build` (Flatbread must be up during the build). |
| `pnpm --filter effort-viz start` | Production Next only (`next start`); run Flatbread separately if needed. |
| `pnpm --filter effort-viz test` | Unit tests: physics/simulation, normalizer, lifecycle derivation, glyph invariants. |
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
  `DetailDrawer`, `RelationLegend` (shared relation + badge metadata)
- `lib/primitives.ts` — per-primitive label, hue, and glyph: the encoding's
  single source of truth
- `lib/glyphs.ts` — area-normalized glyph outlines shared by the canvas and the
  legend
- `lib/lifecycle.ts` — effective lifecycle derived from edges, plus the header
  summary
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
