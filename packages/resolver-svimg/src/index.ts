import { Queue, generateComponentAttributes } from 'svimg/dist/process.js';

const queue = new Queue();

type Config = Parameters<typeof generateComponentAttributes>[0];

const SVIMG_TYPE = `
"""An Image Optimized by Svimg"""
type Svimg {
  """Responsive images and widths"""
  srcset: String

  """Responsive WebP images and widths -- can be disabled with webp: false in config"""
  srcsetwebp: String

  """Responsive Avif images and widths -- can be disabled with avif: false in config"""
  srcsetavif: String

  """inline blurred placeholder image -- can be disabled with skipPlaceholder: true in config"""
  placeholder: String

  """Aspect ratio of image"""
  aspectratio: Float
}`;

/**
 *
 * @param field the field to override
 * @param config
 * @returns
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
