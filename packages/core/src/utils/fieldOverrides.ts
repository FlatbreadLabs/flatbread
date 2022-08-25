import { get, set } from 'lodash-es';
import { CollectionEntry } from '../../dist';
import { Override } from '../types';

/**
 * Get an object containing functions nested in an object structure
 * aligning to the listed overrides in the config
 *
 * @param collectionName the collection string referenced in the config
 * @param entries the flatbread config object
 * @returns an object in the shape of the json schema
 */
export function getFieldOverrides(
  collectionName: string,
  entries: CollectionEntry[]
) {
  const collectionEntry = entries.find(
    (entry) => entry.name === collectionName
  );
  if (!collectionEntry?.overrides) return {};
  const overrides = collectionEntry.overrides;

  return overrides.reduce((fields: any, override: Override) => {
    const { field, type, ...rest } = override;
    let path = field.replace(/\[\]/g, '[0]');
    const endsWithArray = path.endsWith('[0]');

    if (endsWithArray) path = path.slice(0, -3);

    const getPath = path.split(/(?:\.|\[0\])/).at(-1) as string;
    set(fields, path, () => ({
      type: endsWithArray ? `[${override.type}]` : override.type,
      ...rest,
      resolve: (source: any, context: any, args: any) => {
        return override.resolve(get(source, getPath), {
          source,
          context,
          args,
        });
      },
    }));
    return fields;
  }, {});
}
