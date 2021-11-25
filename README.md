[![The thing builds](https://github.com/tonyketcham/flatbread/actions/workflows/test.yml/badge.svg)](https://github.com/tonyketcham/flatbread/actions/workflows/test.yml)

# Flatbread 🥪

Eat your relational markdown data _and query it, too,_ with [GraphQL](https://graphql.org/) inside damn near any framework (statement awaiting peer-review).

If it runs ES Modules + Node 14+, it's down to clown.

Born out of a desire to [Gridsome](https://gridsome.org/) (or [Gatsby](https://www.gatsbyjs.com/)) anything, this project harnesses a plugin architecture to be easily customizable to fit your use cases.

# Install + Use

🚧 This project is currently experimental, and the API may change considerably before `v1.0`. Feel free to hop in and contribute some issues or PRs!

```bash
# This is the most common setup - pick whichever plugins you want to use!
pnpm i flatbread@alpha @flatbread/config@alpha @flatbread/source-filesystem@alpha @flatbread/transformer-markdown@alpha 
```
The following example assumes you're using the [`source-filesystem`](https://github.com/tonyketcham/flatbread/tree/main/packages/source-filesystem) + [`transformer-markdown`](https://github.com/tonyketcham/flatbread/tree/main/packages/source-filesystem) plugins with markdown files containing data you'd like to query with GraphQL. 

> If you're lookin for different use cases, take a peek through the various [`packages`](https://github.com/tonyketcham/flatbread/tree/main/packages) to see if any of those plugins fit your needs. You can find the relevant usage API contained therein.

Take this example where we have a content folder in our repo containing posts and author data:
```gql
content/
├─ posts/
│  ├─ example-post.md
│  ├─ funky-monkey-friday.md
├─ authors/
│  ├─ me.md
│  ├─ my-cat.md
...
flatbread.config.js
package.json
```

In reference to that structure, set up a `flatbread.config.js` in the root of your project:
```js
import defineConfig from '@flatbread/config';
import transformer from '@flatbread/transformer-markdown';
// import transformer from '@flatbread/transformer-yaml';
import filesystem from '@flatbread/source-filesystem';

const transformerConfig = {
  markdown: {
    gfm: true,
    externalLinks: true,
  },
};
export default defineConfig({
  source: filesystem(),
  transformer: transformer(transformerConfig),
  // source: filesystem({ extensions: ['.yml', '.yaml'] }),
  // transformer: transformer(),

  content: [
    {
      path: 'content/posts',
      typeName: 'Post',
      refs: {
        authors: 'Author',
      },
    },
    {
      path: 'content/authors',
      typeName: 'Author',
      refs: {
        friend: 'Author',
      },
    },
  ],
});
```

Now hit your `package.json` and put the keys in the truck: 
```js
// before
"scripts": {
  "dev": "svelte-kit dev",
  "build": "svelte-kit build",
},

// after becoming based and flatbread-pilled
"scripts": {
  "dev": "flatbread start -- svelte-kit dev",
  "build": "flatbread start -- svelte-kit build",
},
```
The Flatbread CLI will capture any script you add in after the `--` and appropriately unite them to live in a land of fairies and wonder while they dance into the sunset as you query your brand spankin new GraphQL server however you'd like from within your app.

### Run that shit 🏃‍♀️
```bash
pnpm run dev
```

### Construct queries 👩‍🍳
If everything goes well, you'll see a pretty `graphql` endpoint echoed out to your console by Flatbread. If you open that link in your browser, Apollo Studio will open for you to explore the schema Flatbread generated. Apollo Studio has some nice auto-prediction and gives you helpers in the schema explorer for building your queries.

You can query that same endpoint in your app in any way you'd like. Flatbread doesn't care what framework you use. 

### Query within your app ❓❓

[Check out the playground for an example](https://github.com/tonyketcham/flatbread/tree/main/playground) of using Flatbread with SvelteKit to safely shoot off GraphQL queries using a static (or node) adapter.

## ☀️ Contributing

Clone the entire monorepo! Once you've installed dependencies with `pnpm i -w`, start a development server:

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
