import { FlatbreadConfig, Override } from '../types';
import { get, set } from 'lodash-es';

/**
 * Get an object containing functions nested in an object structure
 * aligning to the listed overrides in the config
 *
 * @param collection the collection string referenced in the config
 * @param config the flatbread config object
 * @returns an object in the shape of the json schema
 */
export function getFieldOverrides(collection: string, config: FlatbreadConfig) {
  const content = config.content.find(
    (content) => content.collection === collection
  );
  if (!content?.overrides) return {};
  const overrides = content.overrides;

  return overrides.reduce((fields: any, override: Override<any, any>) => {
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
