import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = T | null | undefined;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export interface Scalars {
  /** The `ID` scalar type represents a unique identifier, often used to refetch an object or as key for a cache. The ID type appears in a JSON response as a String; however, it is not intended to be human-readable. When expected as an input type, any string (such as `"4"`) or integer (such as `4`) input value will be accepted as an ID. */
  ID: { input: string; output: string; }
  /** The `String` scalar type represents textual data, represented as UTF-8 character sequences. The String type is most often used by GraphQL to represent free-form human-readable text. */
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  /** The `Int` scalar type represents non-fractional signed whole numeric values. Int can represent values between -(2^31) and 2^31 - 1. */
  Int: { input: number; output: number; }
  /** The `Float` scalar type represents signed double-precision fractional values as specified by [IEEE 754](https://en.wikipedia.org/wiki/IEEE_floating_point). */
  Float: { input: number; output: number; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
}

export interface DocPage {
  __typename?: 'DocPage';
  /** The collection name */
  _collection?: Maybe<Scalars['String']['output']>;
  _content?: Maybe<DocPage__Content>;
  _filename?: Maybe<Scalars['String']['output']>;
  _path?: Maybe<Scalars['String']['output']>;
  _slug?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  order?: Maybe<Scalars['Float']['output']>;
  related?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  section?: Maybe<Scalars['String']['output']>;
  summary?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
}

export interface DocPage__Content {
  __typename?: 'DocPage__content';
  /** A plaintext excerpt taken from the main content */
  excerpt?: Maybe<Scalars['String']['output']>;
  /** The content as HTML */
  html?: Maybe<Scalars['String']['output']>;
  raw?: Maybe<Scalars['String']['output']>;
  /** How long (in minutes) it would take an average reader to read the main content. */
  timeToRead?: Maybe<Scalars['Int']['output']>;
}


export interface DocPage__ContentExcerptArgs {
  length?: InputMaybe<Scalars['Int']['input']>;
}


export interface DocPage__ContentTimeToReadArgs {
  speed?: InputMaybe<Scalars['Int']['input']>;
}

export type Order =
  | 'ASC'
  | 'DESC';

export interface Query {
  __typename?: 'Query';
  /** Find one DocPage by its ID */
  DocPage?: Maybe<DocPage>;
  /** Return a set of DocPages */
  allDocPages?: Maybe<Array<Maybe<DocPage>>>;
}


export interface QueryDocPageArgs {
  id?: InputMaybe<Scalars['ID']['input']>;
}


export interface QueryAllDocPagesArgs {
  filter?: InputMaybe<Scalars['JSON']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
}

export type DocPageSummaryFragment = { __typename?: 'DocPage', id?: string | null, _slug?: string | null, title?: string | null, section?: string | null, order?: number | null, summary?: string | null, related?: Array<string | null> | null, _content?: { __typename?: 'DocPage__content', excerpt?: string | null, timeToRead?: number | null } | null };

export type GetAllDocPagesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllDocPagesQuery = { __typename?: 'Query', allDocPages?: Array<{ __typename?: 'DocPage', id?: string | null, _slug?: string | null, title?: string | null, section?: string | null, order?: number | null, summary?: string | null, related?: Array<string | null> | null, _content?: { __typename?: 'DocPage__content', excerpt?: string | null, timeToRead?: number | null } | null } | null> | null };

export type GetDocPageByIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type GetDocPageByIdQuery = { __typename?: 'Query', DocPage?: { __typename?: 'DocPage', id?: string | null, _slug?: string | null, title?: string | null, section?: string | null, order?: number | null, summary?: string | null, related?: Array<string | null> | null, _content?: { __typename?: 'DocPage__content', raw?: string | null, html?: string | null, excerpt?: string | null, timeToRead?: number | null } | null } | null };

export const DocPageSummaryFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"DocPageSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DocPage"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"_slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"section"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"related"}},{"kind":"Field","name":{"kind":"Name","value":"_content"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"timeToRead"}}]}}]}}]} as unknown as DocumentNode<DocPageSummaryFragment, unknown>;
export const GetAllDocPagesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAllDocPages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allDocPages"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sortBy"},"value":{"kind":"StringValue","value":"order","block":false}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"EnumValue","value":"ASC"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"FragmentSpread","name":{"kind":"Name","value":"DocPageSummary"}}]}}]}},{"kind":"FragmentDefinition","name":{"kind":"Name","value":"DocPageSummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"DocPage"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"_slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"section"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"related"}},{"kind":"Field","name":{"kind":"Name","value":"_content"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"timeToRead"}}]}}]}}]} as unknown as DocumentNode<GetAllDocPagesQuery, GetAllDocPagesQueryVariables>;
export const GetDocPageByIdDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetDocPageById"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"DocPage"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"_slug"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"section"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"related"}},{"kind":"Field","name":{"kind":"Name","value":"_content"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"raw"}},{"kind":"Field","name":{"kind":"Name","value":"html"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"timeToRead"}}]}}]}}]}}]} as unknown as DocumentNode<GetDocPageByIdQuery, GetDocPageByIdQueryVariables>;

/* @flatbread/content-model-types:start */
/**
 * Flatbread content model types generated from flatbread.config.*.
 * These describe configured collections and refs before any GraphQL operation documents are required.
 */
export type FlatbreadCollectionName = "DocPage";

export type FlatbreadRecordByCollection = {
  "DocPage": DocPage;
};

export type FlatbreadRelationTargetByCollection = {
  "DocPage": {};
};

export type FlatbreadRecord<
  Collection extends FlatbreadCollectionName,
> = FlatbreadRecordByCollection[Collection];

export type FlatbreadRelationTarget<
  Collection extends FlatbreadCollectionName,
  Field extends keyof FlatbreadRelationTargetByCollection[Collection],
> = FlatbreadRecord<
  Extract<
    FlatbreadRelationTargetCollection<Collection, Field>,
    FlatbreadCollectionName
  >
> extends infer TargetRecord
  ? FlatbreadRelationCardinality<Collection, Field> extends 'many'
    ? ReadonlyArray<TargetRecord | null> | null
    : TargetRecord | null
  : never;

export type FlatbreadRelationTargetCollection<
  Collection extends FlatbreadCollectionName,
  Field extends keyof FlatbreadRelationTargetByCollection[Collection],
> = FlatbreadRelationTargetByCollection[Collection][Field] extends {
  target: infer Target;
}
  ? Target
  : never;

export type FlatbreadRelationCardinality<
  Collection extends FlatbreadCollectionName,
  Field extends keyof FlatbreadRelationTargetByCollection[Collection],
> = FlatbreadRelationTargetByCollection[Collection][Field] extends {
  cardinality: infer Cardinality;
}
  ? Cardinality
  : never;

export type FlatbreadReadableCollectionName = "DocPage";

export type FlatbreadGraphQLExecutor = <TData>(
  source: string,
  variables?: Record<string, unknown>,
) => Promise<TData>;

/**
 * Experimental generated read API over the Flatbread content model.
 *
 * The API owns collection names, root query names, IDs, and result typing. The
 * current prototype still accepts a GraphQL selection string for fields; invalid
 * or drifting selections are runtime GraphQL errors, not type errors.
 */
export type FlatbreadReadApi = {
  "DocPage": {
    all(selection?: string): Promise<ReadonlyArray<Partial<FlatbreadRecord<"DocPage">>>>;
    find(id: string | number, selection?: string): Promise<Partial<FlatbreadRecord<"DocPage">> | null>;
  };
};

const flatbreadReadApiQueries = {
  "DocPage": { all: "allDocPages", find: "DocPage", idType: "ID", selection: "_filename\n_path\n_slug\nid\ntitle\nsection\norder\nsummary\nrelated\n_content { raw\nhtml\nexcerpt\ntimeToRead }\n_collection" }
} as const;

export function createFlatbreadReadApi(
  execute: FlatbreadGraphQLExecutor,
): FlatbreadReadApi {
  return Object.fromEntries(
    Object.entries(flatbreadReadApiQueries).map(([collection, queries]) => [
      collection,
      {
        all: async (selection = queries.selection) => {
          const readSelection = normalizeFlatbreadReadSelection(selection);
          const operationName = flatbreadReadApiOperationName(collection, 'All');
          const data = await execute<Record<string, ReadonlyArray<unknown>>>(
            `query ${operationName} { ${queries.all} { ${readSelection} } }`,
          );
          return data[queries.all] ?? [];
        },
        find: async (id: string | number, selection = queries.selection) => {
          const readSelection = normalizeFlatbreadReadSelection(selection);
          const operationName = flatbreadReadApiOperationName(collection, 'Find');
          const data = await execute<Record<string, unknown | null>>(
            `query ${operationName}($id: ${queries.idType}) { ${queries.find}(id: $id) { ${readSelection} } }`,
            { id },
          );
          return data[queries.find] ?? null;
        },
      },
    ]),
  ) as FlatbreadReadApi;
}

function normalizeFlatbreadReadSelection(selection: string): string {
  const normalized = selection.trim();
  if (!normalized) {
    throw new Error('Flatbread read API selection must not be empty.');
  }
  return normalized;
}

function flatbreadReadApiOperationName(
  collection: string,
  action: string,
): string {
  const safeCollection = collection.replace(/[^A-Za-z0-9_]/g, '_');
  const suffix = safeCollection && !/^\d/.test(safeCollection)
    ? safeCollection
    : `_${safeCollection || 'Collection'}`;
  return `FlatbreadRead_${suffix}_${action}`;
}
/* @flatbread/content-model-types:end */
