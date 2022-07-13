import { FlatbreadConfig, Override } from 'flatbread';
import { get, set } from 'lodash-es';

export function getFieldOverrides(collection: string, config: FlatbreadConfig) {
  let content = config.content.find(
    (content) => content.collection === collection
  );
  if (!content?.overrides) return {};
  const overrides = content.overrides;

  return overrides.reduce((fields: any, override: Override) => {
    let path = override.field.replace(/\[\]/g, '[0]');
    const endsWithArray = path.endsWith('[0]');

    if (endsWithArray) path = path.slice(0, -3);

    const getPath = path.split(/(?:\.|\[0\])/).at(-1) as string;
    set(fields, path, () => ({
      type: endsWithArray ? `[${override.type}]` : override.type,
      resolve: (source: any) => {
        if (endsWithArray) {
          return override.resolve(get(source, getPath), source);
        }
        return override.resolve(get(source, getPath), source);
      },
    }));
    return fields;
  }, {});

  return {};
}
