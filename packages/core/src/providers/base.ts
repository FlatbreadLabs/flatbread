import { generateSchema } from '../generators/schema';
import { cache } from '../cache/cache';
import { FlatbreadConfig } from '../types';
import { initializeConfig } from '../utils/initializeConfig';

import { graphql, GraphQLArgs, GraphQLSchema } from 'graphql';
import { PromiseOrValue } from 'graphql/jsutils/PromiseOrValue';

/**
 * **Flatbread Provider**
 *
 * Create a new Flatbread provider which contains a GraphQL `query` function that's baked with a Flatbread config
 */
export class FlatbreadProvider {
  private schemaPromise: PromiseOrValue<GraphQLSchema>;

  constructor(config: FlatbreadConfig) {
    const initializedConfig = initializeConfig(config);
    this.schemaPromise =
      cache.schema ?? generateSchema({ config: initializedConfig });
  }

  /**
   * Fulfils GraphQL operations by parsing, validating, and executing a GraphQL document along side a Flatbread-generated GraphQL schema.
   *
   * @param args GraphQLArgs needed for executing a query. Typically, this is just a standard GraphQL query.
   * @returns GraphQL response
   */
  async query(args: Omit<GraphQLArgs, 'schema'>) {
    const schema = await this.schemaPromise;
    return await graphql({ schema, ...args });
  }
}
