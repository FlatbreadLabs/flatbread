import { schemaComposer } from 'graphql-compose';

export function createScalar(str: string) {
  return schemaComposer.createObjectTC(str);
}
