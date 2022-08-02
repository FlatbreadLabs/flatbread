# @flatbread/resolver-svimg 🖼️

> Optimize images for specific fields in content

## 💾 Install

Use `pnpm`, `npm`, or `yarn`:

```bash
pnpm i @flatbread/resolver-svimg
```

## 👩‍🍳 Usage

update your `flatbread.config.js` to optimize images referenced in your content.

```js
// flatbread.config.js
import defineConfig from '@flatbread/config';
import transformer from '@flatbread/transformer-markdown';
import filesystem from '@flatbread/source-filesystem';
import { createSvImgField } from '@flatbread/resolver-svimg';

const transformerConfig = {
  markdown: {
    gfm: true,
    externalLinks: true,
  },
};

export default defineConfig({
  source: filesystem({ extensions: ['.md', '.mdx', '.markdown'] }),
  transformer: transformer(transformerConfig),
  content: [
    {
      path: 'content/posts',
      collection: 'Post',
      refs: {
        authors: 'Author',
      },
    },
    {
      path: 'content/authors',
      collection: 'Author',
      refs: {
        friend: 'Author',
      },
      overrides: [
        createSvImgField('image', { // the field in your content that references your image
          inputDir: 'static/authorImages', // the base directory of your source images
          outputDir: 'static/g', // where to store your optimized images (these should be committed)
          publicPath: '/g', //the base path to add onto the urls in the query data
        }),
        })
      ]
    },
  ],
});
```

## 🧰 Options

Since we use rely on svimg for processing images we expose all of their config located here https://github.com/xiphux/svimg#preprocessor-options

for a better experience, here is a copy pasta of the relevent section of their readme

| Option       | Default                                                           |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------ | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| inputDir     | _required_                                                        | The static asset directory where image urls are retrieved from                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| outputDir    | _required_                                                        | The output directory where resized image files should be written to. This should usually be a subdirectory within the normal static asset directory                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| srcGenerator |                                                                   | An optional function to override the logic of how src URLs are generated for the srcset. This is called once per generated image file, and can be used to customize the generated image URLs - for example, to add or remove path components or to specify a CDN domain.<br />The expected callback signature is:<br />`(path: string, { src, inputDir, outputDir }?: SrcGeneratorInfo) => string`<br />The first parameter is the path to the generated image **relative to the `outputDir`**, with path separators already normalized to `/`. The second optional parameter provides the original image `src` and the `inputDir`/`outputDir` options, and the return value is the URL for the image to be used in the srcset.<br />The default behavior without this parameter will work for common use cases, where the `outputDir` is a subdirectory of the `inputDir` static asset directory and the site is served from the root of the domain. |
| publicPath   | The `outputDir` relative to the `inputDir` static asset directory | **DEPRECATED** `publicPath` is deprecated and will be removed in the next major version. Use a `srcGenerator` function instead: `(path) => '/my/public/path' + path`<br />The public path that images will be served from. This will be prepended to the src url during preprocessing.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| avif         | `true`                                                            | Whether to generate AVIF versions of images in addition to the original image formats                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| webp         | `true`                                                            | Whether to generate WebP versions of images in addition to the original image formats                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |

## Querying the data

When overriding a field, your image will be processed and the resulting type will be converted into an SvImg type, querying all of the fields would like this this in gql

```graphql
image {
  srcset
  srcsetwebp
  srcsetavif
  placeholder
  aspectratio
}
```

we recommend querying all of the fields, and taking advantage of the fantastic web component exposed by svimg to handle these props -- again, we will copy pasta the relevant docs

> when using this component in an framework that supports SSR, s-image needs to be imported client side only
>
> In sveltekit this can be achieved with
>
> ```
> if (browser) { import('svimg/dist/s-image'); }
> ```

```html
<script>
  import 'svimg/dist/s-image';
</script>

<s-image
  srcset="images/splash-600.jpg 600w, images/splash-1200.jpg 1200w"
  srcsetavif="images/splash-600.avif 600w, images/splash-1200.avif 1200w"
  srcsetwebp="images/splash-600.webp 600w, images/splash-1200.webp 1200w"
/>
```

### Configuration

#### Component Attributes

| Property  | Default         |                                                                                                                    |
| --------- | --------------- | ------------------------------------------------------------------------------------------------------------------ |
| src       | _required_      | Image url                                                                                                          |
| alt       |                 | Alternate text for the image                                                                                       |
| class     |                 | CSS classes to apply to image                                                                                      |
| width     |                 | Resize image to specified width in pixels. If not specified, generates images of widths 480, 1024, 1920, and 2560. |
| immediate | `false`         | Set to `true` to disable lazy-loading                                                                              |
| blur      | `40`            | Amount of blur to apply to placeholder                                                                             |
| quality   | _sharp default_ | Quality of the resized images, defaults to sharp's default quality for each image format                           |

## Things of note

The configuration provided in `flatbread.config.js` will affect what fields are populated when querying the related fields. Based on that provided configuration, specific fields will always return `null`, for example:

| configuration field | default | note                                                 |
| ------------------- | ------- | ---------------------------------------------------- |
| skipPlaceholder     | false   | setting to **true** placerholder will always be null |
| srcsetavif          | true    | setting to **false** srcsetavif will always be null  |
| srcsetwebp          | true    | setting to **false** srcsetwebp will always be null  |
