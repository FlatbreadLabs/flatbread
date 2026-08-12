import { source as filesystem } from '@flatbread/source-filesystem';
import { transformer as markdownTransformer } from '@flatbread/transformer-markdown';
import { defineConfig } from '@flatbread/config';
import { proofContent } from '@flatbread/proof';

/**
 * For development, we use Flatbread's Proof on itself as a long-running agent memory layer.
 */
export default defineConfig({
  source: filesystem(),
  transformer: markdownTransformer(),
  content: proofContent(),
});
