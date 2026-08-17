# @flatbread/resolver-svimg 🖼️

> Optimize images for specific fields in content

## 💾 Install

Use `pnpm`, `npm`, or `yarn`:

```bash
pnpm i @flatbread/resolver-svimg
```

## Configure an image field

Add `createSvImgField` to the collection that owns the image field. This
example uses Next.js asset directories; use `static/` instead of `public/` in
SvelteKit.

```js
// flatbread.config.js
import { createSvImgField } from '@flatbread/resolver-svimg';
import { defineConfig, sourceFilesystem, transformerMarkdown } from 'flatbread';

export default defineConfig({
  source: sourceFilesystem(),
  transformer: transformerMarkdown({
    markdown: { gfm: true, externalLinks: true },
  }),
  content: [
    {
      path: 'content/authors',
      collection: 'Author',
      overrides: [
        createSvImgField('image', {
          inputDir: 'public/authorImages',
          outputDir: 'public/g',
          srcGenerator: (path) => `/g/${path}`,
        }),
      ],
    },
  ],
});
```

## 🧰 Options

Pass any `svimg` preprocessing option except `src` to `createSvImgField`. See
the [full upstream option reference](https://github.com/xiphux/svimg#preprocessor-options).

**Paths and URLs**

| Option       | Default                                                           | Purpose                                                                                                                               |
| ------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| inputDir     | _required_                                                        | Directory that holds the source images.                                                                                               |
| outputDir    | _required_                                                        | Directory where generated image files are written.                                                                                    |
| srcGenerator | Derived from `inputDir` and `outputDir`                           | Builds each public URL. It receives the normalized path relative to `outputDir` and optional `{ src, inputDir, outputDir }` context.  |
| publicPath   | The `outputDir` relative to the `inputDir` static asset directory | Deprecated public prefix for generated URLs. It will be removed in the next major version; use `srcGenerator` for new configurations. |

**Output formats**

| Option | Default | Purpose                                       |
| ------ | ------- | --------------------------------------------- |
| avif   | `true`  | Generate AVIF files alongside source formats. |
| webp   | `true`  | Generate WebP files alongside source formats. |

`publicPath` remains available for compatibility, but it is deprecated. Use
`srcGenerator` for new configurations.

## Query the generated image data

The override changes the configured field to the GraphQL `Svimg` type. Request
the fields your component needs:

```graphql
image {
  srcset
  srcsetwebp
  srcsetavif
  placeholder
  aspectratio
}
```

Render those fields with a native `<picture>` element. The first `srcset`
entry provides the fallback `src`:

```tsx
const image = author.image;
const fallback = image?.srcset?.split(',')[0]?.trim().split(' ')[0];

return image?.srcset && fallback ? (
  <picture>
    {image.srcsetavif ? (
      <source srcSet={image.srcsetavif} type="image/avif" />
    ) : null}
    {image.srcsetwebp ? (
      <source srcSet={image.srcsetwebp} type="image/webp" />
    ) : null}
    <img
      src={fallback}
      srcSet={image.srcset}
      alt={author.name ?? 'Author'}
      style={{ aspectRatio: image.aspectratio ?? undefined }}
    />
  </picture>
) : null;
```

## Know which fields can be null

Image options determine which GraphQL fields contain values:

| configuration field | default | note                                         |
| ------------------- | ------- | -------------------------------------------- |
| skipPlaceholder     | false   | When `true`, `placeholder` is always `null`. |
| avif                | true    | When `false`, `srcsetavif` is always `null`. |
| webp                | true    | When `false`, `srcsetwebp` is always `null`. |
