import {
  isComposeOutputType,
  ObjectTypeComposer,
  SchemaComposer,
  upperFirst,
} from 'graphql-compose';
import type { EntryNode } from '../types';

type FieldConfig = Parameters<
  ObjectTypeComposer<unknown, unknown>['setField']
>[1];

export function composeCollectionTC(
  composer: SchemaComposer<unknown>,
  typeName: string,
  reducedNode: EntryNode
): ObjectTypeComposer<unknown, unknown> {
  if (!reducedNode || typeof reducedNode !== 'object') {
    throw new Error(
      'You provide empty object in second arg for `createTC` method.'
    );
  }

  const tc = composer.createObjectTC(typeName);
  Object.keys(reducedNode).forEach((fieldName) => {
    const fieldConfig = getFieldConfig(reducedNode[fieldName], {
      typeName,
      fieldName,
      composer,
    });
    tc.setField(fieldName, fieldConfig);
  });
  return tc;
}

interface FieldConfigOptions {
  composer: SchemaComposer<unknown>;
  fieldName?: string;
  typeName?: string;
}

function getFieldConfig(
  value: unknown,
  options: FieldConfigOptions
): FieldConfig {
  const typeOf = typeof value;
  if (typeOf === 'number') return 'Float';
  if (typeOf === 'string') return 'String';
  if (typeOf === 'boolean') return 'Boolean';
  if (value instanceof Date) return 'Date';
  if (isComposeOutputType(value)) return value;

  if (typeOf === 'object') {
    if (value === null) return 'JSON';
    if (Array.isArray(value)) {
      if (Array.isArray(value[0])) return ['JSON'];
      const firstValue = value[0];
      const mergedValue =
        typeof firstValue === 'object' && firstValue !== null
          ? Object.assign({}, ...value)
          : firstValue;
      const nestedOptions =
        options.typeName && options.fieldName
          ? {
              ...options,
              typeName: options.typeName,
              fieldName: options.fieldName,
            }
          : { composer: options.composer };
      return [getFieldConfig(mergedValue, nestedOptions)] as FieldConfig;
    }
    if (options.typeName && options.fieldName) {
      return composeCollectionTC(
        options.composer,
        `${options.typeName}_${upperFirst(options.fieldName)}`,
        value as EntryNode
      );
    }
  }

  if (typeOf === 'function') {
    return (value as () => FieldConfig)();
  }
  return 'JSON';
}
