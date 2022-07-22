import generateSchema from './generators/schema.js';
export { default as createScalar } from './scalars/createScalar';
export * from './types';

export default generateSchema;
