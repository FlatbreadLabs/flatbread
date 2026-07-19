import {
  defineConfig,
  effortGraphContent,
  sourceFilesystem,
  transformerMarkdown,
} from 'flatbread';

export default defineConfig({
  source: sourceFilesystem(),
  transformer: transformerMarkdown(),
  content: effortGraphContent('../../.flatbread-efforts'),
});
