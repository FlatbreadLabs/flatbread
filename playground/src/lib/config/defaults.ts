import type { FlatbreadConfig } from './types';

const defaultConfig: FlatbreadConfig = {
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
