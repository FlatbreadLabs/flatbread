import type { Source, Transformer, Content } from '@flatbread/core';

/**
 * Flatbread's configuration interface.
 *
 * @todo This needs to be typed more strictly.
 */
export interface FlatbreadConfig {
  source: Source;
  transformer?: Transformer;
  content: Content;
}
export interface ConfigResult<O> {
  filepath?: string;
  config?: O;
}
