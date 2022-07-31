import { Queue, generateComponentAttributes } from 'svimg/dist/process.js';

const queue = new Queue();

/**
 * `GenerateComponentAttributesOptions` from svimg
 */
type Config = Parameters<typeof generateComponentAttributes>[0];

/**
 *
 * @param field the field to override
 * @param config `GenerateComponentAttributesOptions` from svimg (without the `src` field)
 * @see https://github.com/xiphux/svimg/blob/master/src/component/generate-component-attributes.ts#L10
 * @returns
 */
export function createSvImgField(field: string, config: Omit<Config, 'src'>) {
  return {
    field,
    type: () => buildSvImgType(config),
    resolve(src: string) {
      if (!src) return null;
      return generateComponentAttributes({ queue, ...config, src });
    },
  };
}

/**
 * Build the type for the `svimg` field based on user config
 * @param config `GenerateComponentAttributesOptions` from svimg (without the `src` field)
 * @returns GraphQL SDL type
 */
function buildSvImgType(config: Omit<Config, 'src'>) {
  let type = `type SvImg {\n`;
  type += config?.skipGeneration ? `` : `srcset: String\n`;
  type += config?.webp ?? true ? `srcsetwebp: String\n` : ``;
  type += config?.avif ?? true ? `srcsetavif: String\n` : ``;
  type += config?.skipPlaceholder ? `` : `placeholder: String\n`;
  type += `aspectratio: Float\n`;
  type += `}`;

  return type;
}
