export * from '@flatbread/core';

// Convenience exports for the most common use-cases
export { default as defineConfig, loadConfig } from '@flatbread/config';
export { source as sourceFilesystem } from '@flatbread/source-filesystem';
export { transformer as transformerMarkdown } from '@flatbread/transformer-markdown';
export { transformer as transformerYaml } from '@flatbread/transformer-yaml';
