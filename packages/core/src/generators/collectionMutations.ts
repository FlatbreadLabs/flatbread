import { ObjectTypeComposer, SchemaComposer } from 'graphql-compose';
import { LoadedFlatbreadConfig } from '../types';

export interface AddCollectionMutationsArgs {
  name: string;
  pluralName: string;
  config: LoadedFlatbreadConfig;
  objectComposer: ObjectTypeComposer;
  schemaComposer: SchemaComposer;
  allContentNodesJSON: Record<string, any[]>;
}

export default function addCollectionMutations(
  args: AddCollectionMutationsArgs
) {
  const {
    name,
    pluralName,
    config,
    objectComposer,
    schemaComposer,
    allContentNodesJSON,
  } = args;

  schemaComposer.Mutation.addFields({
    [`upsert${name}`]: {
      type: objectComposer,
      args: { [name]: objectComposer.getInputType() },
      description: `Update or create a ${name}`,
      async resolve(_, payload) {
        console.dir({ payload }, { depth: Infinity });
        return payload;
      },
    },
  });
}
