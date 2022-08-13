import { outdent } from './outdent';

class IllegalFieldNameError extends Error {
  constructor(illegalSequence: string) {
    super();
    this.message = outdent`
      The sequence "${illegalSequence}" is reserved and not allowed in field names
      Either:
        - remove all instances of "${illegalSequence}" in the names of fields in your content
        - add a fieldTransform function to your flatbread.config.js to translate to something else
          Example:
            {
              ...,
              fieldTransform: (value) => value.replaceAll("${illegalSequence}",'-')
            }
      `;
  }
}

function isObject(obj: any): obj is Object {
  return obj != null && obj.constructor.name === 'Object';
}

export default function transformKeys(
  obj: any,
  transform: (key: string) => string
): any {
  if (Array.isArray(obj))
    return obj.map((item) => transformKeys(item, transform));
  if (!isObject(obj)) return obj;
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      const newKey = transform(key);
      if (newKey.includes('[]')) throw new IllegalFieldNameError('[]');
      return [newKey, transformKeys(value, transform)];
    })
  );
}
