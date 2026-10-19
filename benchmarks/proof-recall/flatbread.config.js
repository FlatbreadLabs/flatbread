import { source as filesystem } from '@flatbread/source-filesystem';
import { transformer as markdownTransformer } from '@flatbread/transformer-markdown';
import { defineConfig } from '@flatbread/config';
import { proofContent } from '@flatbread/proof';

// The benchmark graph is a separate Proof root, so its fictional records never
// mix with the repository's own memory. Run `flatbread proof …` from here.
export default defineConfig({
  source: filesystem(),
  transformer: markdownTransformer(),
  content: proofContent(),
});
