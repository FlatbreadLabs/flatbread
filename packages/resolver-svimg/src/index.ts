import { Queue, generateComponentAttributes } from 'svimg/dist/process.js';

const queue = new Queue();

/**
 * `GenerateComponentAttributesOptions` from svimg
 */
type Config = Parameters<typeof generateComponentAttributes>[0];

const SVIMG_TYPE = `
"""An Image Optimized by Svimg"""
type Svimg {
  """Responsive images and widths"""
  srcset: String

  """Responsive WebP images and widths -- returns null if disabled via webp: false in config"""
  srcsetwebp: String

  """Responsive Avif images and widths -- returns null if disabled via avif: false in config"""
  srcsetavif: String

  """inline blurred placeholder image -- returns null if disabled via skipPlaceholder: true in config"""
  placeholder: String

  """Aspect ratio of image"""
  aspectratio: Float
}`;

/**
 * Resolves an image to an optimized, `svimg`-compatible set of attributes with optional image placeholders and fallbacks.
 *
 * @param field the field to override
 * @param config `GenerateComponentAttributesOptions` from svimg (without the `src` field)
 * @see https://github.com/xiphux/svimg/blob/master/src/component/generate-component-attributes.ts#L10
 */
export function createSvImgField(field: string, config: Omit<Config, 'src'>) {
  return {
    field,
    type: SVIMG_TYPE,
    resolve(src: string) {
      if (!src) return null;
      return generateComponentAttributes({ queue, ...config, src });
    },
  };
}
