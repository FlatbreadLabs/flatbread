import { ObjectTypeComposer, SchemaComposer } from 'graphql-compose';
import resolveQueryArgs from '../resolvers/arguments';

import {
  generateArgsForAllItemQuery,
  generateArgsForManyItemQuery,
  generateArgsForSingleItemQuery,
} from '../generators/arguments';
import { cloneDeep } from 'lodash-es';
import { EntryNode, LoadedFlatbreadConfig, Transformer } from '../types';

export interface AddCollectionQueriesArgs {
  name: string;
  pluralName: string;
  config: LoadedFlatbreadConfig;
  objectComposer: ObjectTypeComposer;
  schemaComposer: SchemaComposer;
  allContentNodesJSON: Record<string, any[]>;
  transformersById: Record<string, Transformer>;
}

export default function addCollectionQueries(args: AddCollectionQueriesArgs) {
  const {
    name,
    pluralName,
    config,
    objectComposer,
    schemaComposer,
    allContentNodesJSON,
  } = args;

  const pluralTypeQueryName = 'all' + pluralName;

  objectComposer.addResolver({
    name: 'findById',
    type: () => objectComposer,
    description: `Find one ${name} by its ID`,
    args: generateArgsForSingleItemQuery(),
    resolve: (rp: Record<string, any>) =>
      cloneDeep(
        allContentNodesJSON[name].find(
          (node: EntryNode) => node.id === rp.args.id
        )
      ),
  });

  objectComposer.addResolver({
    name: 'findMany',
    type: () => [objectComposer],
    description: `Find many ${pluralName} by their IDs`,
    args: generateArgsForManyItemQuery(pluralName),
    resolve: (rp: Record<string, any>) => {
      const idsToFind = rp.args.ids ?? [];
      const matches =
        cloneDeep(allContentNodesJSON[name])?.filter((node: EntryNode) =>
          idsToFind?.includes(node.id)
        ) ?? [];
      return resolveQueryArgs(matches, rp.args, config, {
        type: {
          name: name,
          pluralName: pluralName,
          pluralQueryName: pluralTypeQueryName,
        },
      });
    },
  });

  objectComposer.addResolver({
    name: 'all',
    args: generateArgsForAllItemQuery(pluralName),
    type: () => [objectComposer],
    description: `Return a set of ${pluralName}`,
    resolve: (rp: Record<string, any>) => {
      const nodes = cloneDeep(allContentNodesJSON[name]);
      return resolveQueryArgs(nodes, rp.args, config, {
        type: {
          name: name,
          pluralName: pluralName,
          pluralQueryName: pluralTypeQueryName,
        },
      });
    },
  });

  schemaComposer.Query.addFields({
    /**
     * Add find by ID to each content type
     */
    [name]: objectComposer.getResolver('findById'),
    /**
     * Add find 'many' to each content type
     */
    [pluralTypeQueryName]: objectComposer.getResolver('all'),
  });
}
