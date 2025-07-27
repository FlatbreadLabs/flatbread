import {
  createExcerpt,
  estimateTimeToRead,
  transformContentToHTML,
} from '../processors';
import sanitizeHtml from 'sanitize-html';
import { MarkdownTransformerConfig } from '../types';
import { GraphQLResolver } from '@flatbread/core';

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
  resolve: (async (parentNode: any, args: { speed: number }) => {
    const content = parentNode._content || {};
    if (!content.html) {
      content.html = await transformContentToHTML(
        content.raw,
        config.markdown ?? {}
      );
    }

    const plaintext = content.html
      ? sanitizeHtml(content.html, {
          allowedAttributes: {},
          allowedTags: [],
        }).replace(/\r?\n|\r/g, ' ')
      : '';

    return estimateTimeToRead(plaintext, args.speed);
  }) as GraphQLResolver,
});

/**
 * A GraphQL field for an excerpt of the content, if it exists.
 */
export const excerpt = (config: MarkdownTransformerConfig) => () => ({
  type: () => 'String',
  description: 'A plaintext excerpt taken from the main content',
  args: {
    length: {
      type: () => 'Int',
      description: 'The length of the excerpt in words',
      defaultValue: 200,
    },
  },
  resolve: (async (parentNode: any, args: { length: number }) => {
    const content = parentNode._content || {};
    if (!content.html) {
      content.html = await transformContentToHTML(
        content.raw,
        config.markdown ?? {}
      );
    }

    const plaintext = content.html
      ? sanitizeHtml(content.html, {
          allowedAttributes: {},
          allowedTags: [],
        }).replace(/\r?\n|\r/g, ' ')
      : '';
    return createExcerpt(plaintext, args.length);
  }) as GraphQLResolver,
});

/**
 * A GraphQL field for the content as HTML, if it exists.
 */
export const html = (config: MarkdownTransformerConfig) => () => ({
  type: () => 'String',
  description: 'The content as HTML',
  resolve: (async (parentNode: any) => {
    const content = parentNode._content || {};
    if (!content.html) {
      content.html = await transformContentToHTML(
        content.raw,
        config.markdown ?? {}
      );
    }
    return content.html;
  }) as GraphQLResolver,
});
