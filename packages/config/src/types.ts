import type { Transformer } from '@oyu/core';

/**
 * Oyu's configuration interface.
 *
 * @todo This needs to be typed more strictly.
 */
export interface OyuConfig {
  source: any;
  transformer: Transformer;
  content: [];
}
