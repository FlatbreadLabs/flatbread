// import { OyuJsonNode } from './types';

// core logic will go here
export * from './types';

// const summarizeTypeShape = (nodes: OyuJsonNode[]): Record<string, any> => {
//   const schema = nodes.reduce((acc, node) => {
//     Object.keys(arr);
//   }, {});
//   return;
// };

// import {schemaComposer} from 'graphql-compose';

// const AuthorTC = schemaComposer.createObjectTC({
//   name: 'Author',
//   fields: {
//     id: 'Int!',
//     firstName: 'String',
//     lastName: 'String',
//     posts: {
//       type: () => [PostTC], // arrow function for `type` helps to solve hoisting problems and keep ability to list all fields
//       args: {
//         limit: { type: 'Int', defaultValue: 20 },
//         skip: 'Int', // shortand to `{ type: 'Int' }`
//         sort: `enum AuthorPostsSortEnum { ASC DESC }`, // type creation via SDL
//       },
//       resolve: () => { ... },
//     }
//   },
// });
