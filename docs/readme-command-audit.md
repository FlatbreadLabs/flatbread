# README command audit

This audit reconciles the onboarding command drift called out in the PMF task board. It records the canonical paths and the remaining package-specific surfaces that should stay aligned.

## Canonical root path

Use this path for first-time contributors and evaluators:

```bash
pnpm install
pnpm build
cd examples/nextjs
npx flatbread codegen --verbose
npx flatbread start -- next dev --turbopack
```

Why this is canonical:

- `pnpm install` matches the monorepo package manager and enforced `preinstall` script.
- `pnpm build` is required before tests or dev servers because packages run from built output.
- `examples/nextjs` is the preferred demo project in `CONTRIBUTING.md`.
- `npx flatbread start -- next dev --turbopack` avoids the example package's `--https` script, which can require local certificates in headless environments.
- `npx flatbread codegen --verbose` demonstrates the current typed GraphQL result path before the future generated TypeScript read API exists.

## Command surfaces

| Surface                                           | Status           | Canonical guidance                                                                                                                                                   |
| ------------------------------------------------- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Root `README.md` / `packages/flatbread/README.md` | Updated          | Lead with the Next.js example and the command block above.                                                                                                           |
| `CONTRIBUTING.md`                                 | Already aligned  | Keeps `pnpm install`, `pnpm build`, `pnpm play`, `pnpm verify`, and the Next.js example as preferred local development path.                                         |
| `examples/nextjs/README.md`                       | Updated          | Uses pnpm and `npx flatbread start -- next dev --turbopack`; no longer recommends `npm install`, `npx flatbread dev`, or a separate Next terminal as the first path. |
| Package READMEs                                   | Package-specific | May document package APIs, but should point back to the root quickstart for first success.                                                                           |
| `package.json` scripts                            | Existing         | `pnpm play` remains a contributor shortcut. The explicit command above remains better for docs because it avoids HTTPS certificate setup.                            |

## Guidance rules

- Use `pnpm`, not `npm`, for repository-local work.
- Use `npx flatbread` in docs when invoking the CLI directly from an example shell.
- Use `flatbread start -- <framework command>` for runtime examples.
- Introduce GraphQL as the current query interface after the relation model is explained.
- Mention `npx flatbread codegen --watch` as an advanced development command, not as the first success path.

## Remaining follow-up

Once generated TypeScript read APIs exist, this audit should be revisited so the canonical path can end with a type-safe non-GraphQL query result while keeping GraphQL as the optional interface.
