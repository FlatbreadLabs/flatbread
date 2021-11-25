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
export const timeToRead = (config: MarkdownTransformerConfig) => () => ({
  type: () => 'Int',
  description:
    'How long (in minutes) it would take an average reader to read the main content.',
  args: {
    speed: {
      type: () => 'Int',
      description: 'The reading speed in words per minute',
      defaultValue: 230,
    },
  },
  resolve: async (parentNode: any, args: { speed: number }) => {
    if (!parentNode.html) {
      parentNode.html = await transformContentToHTML(
        parentNode.raw,
        config.markdown ?? {}
      );
    }

    const plaintext = parentNode
      ? sanitizeHtml(parentNode.html, {
          allowedAttributes: {},
          allowedTags: [],
        }).replace(/\r?\n|\r/g, ' ')
      : '';

    return estimateTimeToRead(plaintext, args.speed);
  },
});

/**
 * A GraphQL field for an excerpt of the content, if it exists.
 */
export const excerpt = (config: MarkdownTransformerConfig) => () => ({
  type: 'String',
  description: 'A plaintext excerpt taken from the main content',
  args: {
    length: {
      type: () => 'Int',
      description: 'The length of the excerpt in words',
      defaultValue: 200,
    },
  },
  resolve: async (parentNode: any, args: { length: number }) => {
    if (!parentNode.html) {
      parentNode.html = await transformContentToHTML(
        parentNode.raw,
        config.markdown ?? {}
      );
    }

    const plaintext = parentNode
      ? sanitizeHtml(parentNode.html, {
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
export const html = (config: MarkdownTransformerConfig) => () => ({
  type: () => 'String',
  description: 'The content as HTML',
  resolve: async (parentNode: any) => {
    if (!parentNode.html) {
      parentNode.html = await transformContentToHTML(
        parentNode.raw,
        config.markdown ?? {}
      );
    }
    return parentNode.html;
  },
});
