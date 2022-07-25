# @flatbread/config 📐

> Provides a typed config helper function, config validation, and auto-config retrieval.

## 💾 Install

Use `pnpm`, `npm`, or `yarn`:

```bash
pnpm i @flatbread/config
```

Valid config filenames:

- `flatbread.config.js`
- `flatbread.config.mjs`
- `flatbread.config.cjs`
- `flatbread.config.ts`
- `flatbread.config.mts`
- `flatbread.config.cts`

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

## 😳 Advanced Usage

If you're building something custom, piecemealed from these modules, you can make use of schema validation & config auto-loading.

### `async loadConfig(...)`

Pulls the user config from an optionally specified filepath. By default, this will search the current working directory.

#### options

- Type: `{cwd?: string | undefined;}`
- Default: `{}`

Options for loading the config file, defaults to `{}`. Can pass in `cwd` as a path `string` to override the current working directory.

### `validateConfigHasExports(config)`

Validate that the user config has a default export that is an object.

### `validateConfigStructure(config)`

Validate that the user config has `source` and `content` properties.
