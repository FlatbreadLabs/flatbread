import { Queue, generateComponentAttributes } from 'svimg/dist/process';

const SVIMG_TYPE = `
type Svimg {
  srcset: String
  srcsetwebp: String;
  srcsetavif: String;
  placeholder: String;
  aspectratio: Float;
}`;

const queue = new Queue();

// copied from https://github.com/xiphux/svimg/blob/master/src/component/generate-component-attributes.ts#L9
interface Config {
  src: string;
  queue?: Queue;
  inputDir: string;
  outputDir: string;
  publicPath?: string;
  webp?: boolean;
  avif?: boolean;
  widths?: number[];
  quality?: number;
  skipGeneration?: boolean;
  skipPlaceholder?: boolean;
}

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
    resole: (src: string) =>
      generateComponentAttributes({ queue, ...config, src }),
  };
}
