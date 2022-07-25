import { generateSchema } from '../generators/schema';
import { FlatbreadConfig, LoadedFlatbreadConfig } from '../types';
import { initializeConfig } from '../utils/initializeConfig';

import { graphql, GraphQLArgs, GraphQLSchema } from 'graphql';

/**
 * Flatbread Provider
 * create a new flatbread provide that provides a query function based on a flatbread config
 */
export class FlatbreadProvider {
  private schemaPromise: Promise<GraphQLSchema>;

  constructor(config: FlatbreadConfig) {
    const initializedConfig = initializeConfig(config);
    this.schemaPromise = generateSchema({ config: initializedConfig });
  }

  async query(args: Omit<GraphQLArgs, 'schema'>) {
    const schema = await this.schemaPromise;
    return await graphql({ schema, ...args });
  }
}
