import { generateSchema } from '../generators/schema';
import { LoadedFlatbreadConfig } from '../types';

import { graphql, GraphQLArgs, GraphQLSchema } from 'graphql';

/**
 * Flatbread Provider
 * create a new flatbread provide that provides a query function based on a flatbread config
 */
export class FlatbreadProvider {
  private schemaPromise: Promise<GraphQLSchema>;

  constructor(config: LoadedFlatbreadConfig) {
    this.schemaPromise = generateSchema({ config });
  }

  async query(args: Omit<GraphQLArgs, 'schema'>) {
    const schema = await this.schemaPromise;
    return await graphql({ schema, ...args });
  }
}
