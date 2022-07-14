import generateSchema, { FlatbreadConfig } from '@flatbread/core';
import { graphql, GraphQLArgs, Source } from 'graphql';

export default async function initFlatbread(config: FlatbreadConfig) {
  const schema = await generateSchema({ config });

  return async function query(args: Omit<GraphQLArgs, 'schema'>) {
    return graphql({ schema, ...args });
  };
}
