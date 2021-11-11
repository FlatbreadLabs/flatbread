import type { OyuConfig } from './types';

const defaultConfig: OyuConfig = {
  identifier: {
    method: 'slug',
  },
  content: [],
  mdsvex: {
    extensions: ['.svelte.md', '.md', '.svx'],

    smartypants: {
      // dashes: 'oldschool'
    },

    remarkPlugins: [],
    rehypePlugins: [],
  },
};

export default defaultConfig;
