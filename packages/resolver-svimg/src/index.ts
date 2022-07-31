import { Queue, generateComponentAttributes } from 'svimg/dist/process.js';

const queue = new Queue();

type Config = Parameters<typeof generateComponentAttributes>[0];

const SVIMG_TYPE = `
type Svimg {
  srcset: String
  srcsetwebp: String
  srcsetavif: String
  placeholder: String
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
