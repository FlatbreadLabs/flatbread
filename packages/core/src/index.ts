import { schemaComposer } from 'graphql-compose';
import generateSchema from './generators/schema.js';

export * from './types';
export default generateSchema;

export function createScalar(str: string) {
  return schemaComposer.createObjectTC(str);
}
