[![The thing builds](https://github.com/tonyketcham/flatbread/actions/workflows/test.yml/badge.svg)](https://github.com/tonyketcham/flatbread/actions/workflows/test.yml)

# Flatbread 🥪

Eat your relational markdown data _and query it, too,_ with [GraphQL](https://graphql.org/) inside damn near any framework (statement awaiting peer-review).

If it runs ES Modules + Node 14+, it's down to clown.

Born out of a desire to [Gridsome](https://gridsome.org/) (or [Gatsby](https://www.gatsbyjs.com/)) anything.

## ☀️ Contributing

🚧 This project is currently experimental, is not ready for production, and the API may change considerably before `v1.0`. Feel free to hop in and contribute some issues or PRs!

Once you've installed dependencies with `pnpm i -w`, start a development server:

### **development server** 🎒

This will run a dev server across packages in the monorepo

```bash
pnpm dev -w
```

### **working on a package** ⚒️

Open another **terminal** tab.

| ☝️ Keep the dev server running in your other tab |
| ------------------------------------------------ |

#### Option 1: use the Playground as a demo project

This allows you to work in the full context of a Flatbread instance as an end-user would, except you can tinker with the `packages` internals.

```bash
cd playground
pnpm dev
```

This is a good option when you want to test without creating temporary clutter per-package that you wouldn't want to commit.

#### Option 2: scope to a specific package

In the new tab, scope yourself into the specific package you wanna mess with.

```bash
cd packages/<package>
```

Run the file containing where you invoke your function at the top level.

```bash
node dist/index.mjs # ya need Node v14.18+
```

### **build for production** 📦

This will use `tsup` to build each package linked in the monorepo unless opted out per-package.

```bash
pnpm build
```

## 📓 Sidenotes

The transpiled TS files in the [`playground`](https://github.com/tonyketcham/flatbread/tree/main/playground) are being tracked in the repo to appease the Vite gods so I can develop quicker. As the project progresses, I'll likely yeet those outta here.

![Alt](https://repobeats.axiom.co/api/embed/bc88afba30187e569d95f3edb95d487b8134720e.svg 'Repobeats analytics image')

Huge shoutouts to [@antfu](https://github.com/antfu/) and [@sveltejs/kit](https://github.com/sveltejs/kit) for both having invaluable reference points to guide me through learning more advanced Node, Typescript, and monorepo design all in parallel during this project.
