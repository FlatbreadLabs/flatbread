import resolveQueryArgs from '../resolvers/arguments';

import { SchemaComposer } from 'graphql-compose';
import { cloneDeep } from 'lodash-es';
import {
  generateArgsForAllItemQuery,
  generateArgsForManyItemQuery,
  generateArgsForSingleItemQuery,
} from '../generators/arguments';
import { CollectionResolverArgs, EntryNode } from '../types';

export default function addCollectionQueries(
  schemaComposer: SchemaComposer,
  args: CollectionResolverArgs & { allContentNodesJSON: Record<string, any[]> }
) {
  const { name, pluralName, config, objectTypeComposer, allContentNodesJSON } =
    args;

  const pluralTypeQueryName = 'all' + pluralName;

  objectTypeComposer.addResolver({
    name: 'findById',
    type: () => objectTypeComposer,
    description: `Find one ${name} by its ID`,
    args: generateArgsForSingleItemQuery(),
    resolve: (rp: Record<string, any>) =>
      cloneDeep(
        allContentNodesJSON[name].find(
          (node: EntryNode) => node.id === rp.args.id
        )
      ),
  });

  objectTypeComposer.addResolver({
    name: 'findMany',
    type: () => [objectTypeComposer],
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

  objectTypeComposer.addResolver({
    name: 'all',
    args: generateArgsForAllItemQuery(pluralName),
    type: () => [objectTypeComposer],
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
    [name]: objectTypeComposer.getResolver('findById'),
    /**
     * Add find 'many' to each content type
     */
    [pluralTypeQueryName]: objectTypeComposer.getResolver('all'),
  });
}
