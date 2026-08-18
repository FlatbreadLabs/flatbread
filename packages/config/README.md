# @flatbread/config 📐

> Provides a typed config helper function, config validation, and auto-config retrieval.

## 💾 Install

Use `pnpm`, `npm`, or `yarn`:

```bash
pnpm i @flatbread/config
```

Flatbread loads JavaScript or TypeScript config files:

- JavaScript: `flatbread.config.js`, `flatbread.config.mjs`, or
  `flatbread.config.cjs`
- TypeScript: `flatbread.config.ts`, `flatbread.config.mts`, or
  `flatbread.config.cts`

## 👩‍🍳 Typical Usage

### defineConfig(config)

Provides assistance to your IDE for building your config

```js
// flatbread.config.js
import defineConfig from '@flatbread/config';

export default defineConfig({
  ...
});
```

## 😳 Programmatic Usage

Use the exported `loadConfig` helper when custom tooling needs Flatbread's
loaded and initialized config.

### `async loadConfig(...)`

Pulls the user config from an optionally specified filepath. By default, this will search the current working directory.

#### options

- Type: `{cwd?: string | undefined;}`
- Default: `{}`

Options for loading the config file, defaults to `{}`. Can pass in `cwd` as a path `string` to override the current working directory.
