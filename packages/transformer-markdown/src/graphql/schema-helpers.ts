import {
  createExcerpt,
  estimateTimeToRead,
  transformContent,
} from '../processors';

import { GraphQLInt, GraphQLString } from 'graphql';
import sanitizeHtml from 'sanitize-html';
import { MarkdownTransformerConfig } from '../types';

/**
 * A GraphQL field for the time to read the content, if it exists.
 */
export const timeToRead = {
  type: GraphQLInt,
  args: {
    speed: {
      type: GraphQLInt,
      description: 'The reading speed in words per minute',
      defaultValue: 230,
    },
  },
  resolve: (node: any, args: { speed: number }) =>
    estimateTimeToRead(node.fields.content, args.speed),
};

/**
 * A GraphQL field for an excerpt of the content, if it exists.
 */
export const excerpt = {
  type: GraphQLString,
  args: {
    length: {
      type: GraphQLInt,
      description: 'The length of the excerpt in words',
      defaultValue: 200,
    },
  },
  resolve: (
    node: any,
    args: { length: number },
    config: MarkdownTransformerConfig
  ) => {
    if (!node.fields.content.html) {
      node.fields.content.html = transformContent(node, config.markdown ?? {});
    }

    const plaintext = node.fields.content
      ? sanitizeHtml(node.fields.content.html, {
          allowedAttributes: {},
          allowedTags: [],
        }).replace(/\r?\n|\r/g, ' ')
      : '';
    return createExcerpt(plaintext, args.length);
  },
};

/**
 * A GraphQL field for the content as HTML, if it exists.
 */
export const content = {
  type: GraphQLString,
  resolve: (node: any, config: MarkdownTransformerConfig) => {
    if (!node.fields.content.html) {
      node.fields.content.html = transformContent(node, config.markdown ?? {});
    }
    return node.fields.content.html;
  },
};
