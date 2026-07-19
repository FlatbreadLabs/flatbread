import { source as filesystem } from '@flatbread/source-filesystem';
import { transformer as markdownTransformer } from '@flatbread/transformer-markdown';
import { defineConfig } from '@flatbread/config';
import { effortGraphContent } from '@flatbread/effort-graph';

/**
 * For development, we use Flatbread's Effort Graph on itself as a long-running agent memory layer.
 */
export default defineConfig({
  source: filesystem(),
  transformer: markdownTransformer(),
  content: effortGraphContent(),
});
