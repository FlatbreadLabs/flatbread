import {
  createExcerpt,
  estimateTimeToRead,
  transformContentToHTML,
} from '../processors';
import sanitizeHtml from 'sanitize-html';
import { MarkdownTransformerConfig } from '../types';

/**
 * A GraphQL field for the time to read the content, if it exists.
 */
export const timeToRead = () => ({
  type: () => 'Int',
  args: {
    speed: {
      type: () => 'Int',
      description: 'The reading speed in words per minute',
      defaultValue: 230,
    },
  },
  resolve: (node: any, args: { speed: number }) =>
    estimateTimeToRead(node.fields.content, args.speed),
});

/**
 * A GraphQL field for an excerpt of the content, if it exists.
 */
export const excerpt = () => ({
  type: 'String',
  args: {
    length: {
      type: () => 'Int',
      description: 'The length of the excerpt in words',
      defaultValue: 200,
    },
  },
  resolve: async (
    node: any,
    args: { length: number },
    config: MarkdownTransformerConfig
  ) => {
    if (!node.fields.content.html) {
      node.fields.content.html = await transformContentToHTML(
        node.fields.content.raw,
        config.markdown ?? {}
      );
    }

    const plaintext = node.fields.content
      ? sanitizeHtml(node.fields.content.html, {
          allowedAttributes: {},
          allowedTags: [],
        }).replace(/\r?\n|\r/g, ' ')
      : '';
    return createExcerpt(plaintext, args.length);
  },
});

/**
 * A GraphQL field for the content as HTML, if it exists.
 */
export const html = () => ({
  type: () => 'String',
  resolve: async (node: any, config: MarkdownTransformerConfig) => {
    if (!node.fields.content.html) {
      node.fields.content.html = await transformContentToHTML(
        node.fields.content.raw,
        config.markdown ?? {}
      );
    }
    return node.fields.content.html;
  },
});
