# おゆ (O yu) [♨️🚰]

'Rehydrate' your relational markdown data and query it with [GraphQL](https://graphql.org/) inside [SvelteKit](https://kit.svelte.dev/) and more.

Inspired by [Gridsome](https://gridsome.org/), [JungleJS](https://www.junglejs.org/), and [Gatsby](https://www.gatsbyjs.com/).

## ☀️ Contributing

🚧 This project is currently experimental, is not ready for production, and the API may change considerably before `v1.0`. Feel free to hop in and contribute some issues or PRs!

Once you've installed dependencies with `pnpm install`, start a development server:

### **development server** 🎒

This will run a dev server across packages in the monorepo

```bash
pnpm dev
```

### **working on a package** ⚒️

Open another **terminal** tab.

| ☝️ Keep the dev server running in your other tab |
| ------------------------------------------------ |

In the new tab, scope yourself into **oyu** or the specific package you wanna mess with.

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

The transpiled TS files in the [`playground`](https://github.com/tonyketcham/oyu/tree/main/playground) are being tracked in the repo to appease the Vite gods so I can develop quicker. As the project progresses, I'll likely yeet those outta here.
