import type { Source, Transformer, Content } from '@oyu/core';

/**
 * Oyu's configuration interface.
 *
 * @todo This needs to be typed more strictly.
 */
export interface OyuConfig {
  source: Source;
  transformer?: Transformer;
  content: Content;
}
export interface ConfigResult<O> {
  filepath?: string;
  config?: O;
}
