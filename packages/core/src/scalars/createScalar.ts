import { schemaComposer } from 'graphql-compose';

export default function createScalar(str: string) {
  return schemaComposer.createObjectTC(str);
}
