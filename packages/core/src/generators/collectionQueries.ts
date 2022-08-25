import resolveQueryArgs from '../resolvers/arguments';

import { SchemaComposer } from 'graphql-compose';
import { cloneDeep, get } from 'lodash-es';
import {
  generateArgsForAllItemQuery,
  generateArgsForManyItemQuery,
} from '../generators/arguments';
import { CollectionResolverArgs, EntryNode } from '../types';

export default function addCollectionQueries(
  schemaComposer: SchemaComposer,
  args: CollectionResolverArgs & { allContentNodesJSON: Record<string, any[]> }
): void {
  const {
    name,
    pluralName,
    config,
    objectTypeComposer,
    allContentNodesJSON,
    collectionEntry,
  } = args;

  const pluralTypeQueryName = 'all' + pluralName;

  objectTypeComposer.addResolver({
    name: 'findByReferenceField',
    type: () => objectTypeComposer,
    description: `Find one ${name} by its ID`,
    args: {
      [collectionEntry.referenceField]: objectTypeComposer
        .getInputTypeComposer()
        .getField(collectionEntry.referenceField),
    },
    resolve: (rp: Record<string, any>) =>
      cloneDeep(
        allContentNodesJSON[name].find(
          (node: EntryNode) =>
            node[collectionEntry.referenceField] ===
            rp.args[collectionEntry.referenceField]
        )
      ),
  });

  objectTypeComposer.addResolver({
    name: 'findMany',
    type: () => [objectTypeComposer],
    description: `Find many ${pluralName} by their ${collectionEntry.referenceField}`,
    args: generateArgsForManyItemQuery(pluralName),
    resolve: (rp: Record<string, any>) => {
      const referencesToFind = rp.args.references ?? [];
      const matches =
        cloneDeep(allContentNodesJSON[name])?.filter((node: EntryNode) =>
          referencesToFind?.includes(get(node, collectionEntry.referenceField))
        ) ?? [];
      return resolveQueryArgs(matches, rp.args, config, {
        collectionEntry,
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
        collectionEntry,
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
    [name]: objectTypeComposer.getResolver('findByReferenceField'),
    /**
     * Add find 'many' to each content type
     */
    [pluralTypeQueryName]: objectTypeComposer.getResolver('all'),
  });
}
