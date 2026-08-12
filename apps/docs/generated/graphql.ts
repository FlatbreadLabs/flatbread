import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
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
};

export type Doc = {
  __typename?: 'Doc';
  /** The collection name */
  _collection?: Maybe<Scalars['String']['output']>;
  _content?: Maybe<Doc__Content>;
  _filename?: Maybe<Scalars['String']['output']>;
  _path?: Maybe<Scalars['String']['output']>;
  _slug?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  order?: Maybe<Scalars['Float']['output']>;
  /** All Docs that are referenced by this Doc */
  related?: Maybe<Array<Maybe<Doc>>>;
  /** The Section referenced by this Doc */
  section?: Maybe<Section>;
  summary?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
};


export type DocRelatedArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};

export type Doc__Content = {
  __typename?: 'Doc__content';
  /** A plaintext excerpt taken from the main content */
  excerpt?: Maybe<Scalars['String']['output']>;
  /** The content as HTML */
  html?: Maybe<Scalars['String']['output']>;
  raw?: Maybe<Scalars['String']['output']>;
  /** How long (in minutes) it would take an average reader to read the main content. */
  timeToRead?: Maybe<Scalars['Int']['output']>;
};


export type Doc__ContentExcerptArgs = {
  length?: InputMaybe<Scalars['Int']['input']>;
};


export type Doc__ContentTimeToReadArgs = {
  speed?: InputMaybe<Scalars['Int']['input']>;
};

export type Order =
  | 'ASC'
  | 'DESC';

export type Package = {
  __typename?: 'Package';
  /** The collection name */
  _collection?: Maybe<Scalars['String']['output']>;
  _content?: Maybe<Package__Content>;
  _filename?: Maybe<Scalars['String']['output']>;
  _path?: Maybe<Scalars['String']['output']>;
  _slug?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
};

export type Package__Content = {
  __typename?: 'Package__content';
  /** A plaintext excerpt taken from the main content */
  excerpt?: Maybe<Scalars['String']['output']>;
  /** The content as HTML */
  html?: Maybe<Scalars['String']['output']>;
  raw?: Maybe<Scalars['String']['output']>;
  /** How long (in minutes) it would take an average reader to read the main content. */
  timeToRead?: Maybe<Scalars['Int']['output']>;
};


export type Package__ContentExcerptArgs = {
  length?: InputMaybe<Scalars['Int']['input']>;
};


export type Package__ContentTimeToReadArgs = {
  speed?: InputMaybe<Scalars['Int']['input']>;
};

export type Query = {
  __typename?: 'Query';
  /** Find one Doc by its ID */
  Doc?: Maybe<Doc>;
  /** Find one Package by its ID */
  Package?: Maybe<Package>;
  /** Find one Section by its ID */
  Section?: Maybe<Section>;
  /** Return a set of Docs */
  allDocs?: Maybe<Array<Maybe<Doc>>>;
  /** Return a set of Packages */
  allPackages?: Maybe<Array<Maybe<Package>>>;
  /** Return a set of Sections */
  allSections?: Maybe<Array<Maybe<Section>>>;
};


export type QueryDocArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryPackageArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type QuerySectionArgs = {
  id?: InputMaybe<Scalars['ID']['input']>;
};


export type QueryAllDocsArgs = {
  filter?: InputMaybe<Scalars['JSON']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAllPackagesArgs = {
  filter?: InputMaybe<Scalars['JSON']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAllSectionsArgs = {
  filter?: InputMaybe<Scalars['JSON']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};

export type Section = {
  __typename?: 'Section';
  /** The collection name */
  _collection?: Maybe<Scalars['String']['output']>;
  _content?: Maybe<Section__Content>;
  _filename?: Maybe<Scalars['String']['output']>;
  _path?: Maybe<Scalars['String']['output']>;
  _slug?: Maybe<Scalars['String']['output']>;
  blurb?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  order?: Maybe<Scalars['Float']['output']>;
  title?: Maybe<Scalars['String']['output']>;
};

export type Section__Content = {
  __typename?: 'Section__content';
  /** A plaintext excerpt taken from the main content */
  excerpt?: Maybe<Scalars['String']['output']>;
  /** The content as HTML */
  html?: Maybe<Scalars['String']['output']>;
  /** How long (in minutes) it would take an average reader to read the main content. */
  timeToRead?: Maybe<Scalars['Int']['output']>;
};


export type Section__ContentExcerptArgs = {
  length?: InputMaybe<Scalars['Int']['input']>;
};


export type Section__ContentTimeToReadArgs = {
  speed?: InputMaybe<Scalars['Int']['input']>;
};

export type AllSectionsQueryVariables = Exact<{ [key: string]: never; }>;


export type AllSectionsQuery = { __typename?: 'Query', allSections?: Array<{ __typename?: 'Section', id?: string | null, title?: string | null, order?: number | null, blurb?: string | null } | null> | null };

export type AllDocsQueryVariables = Exact<{ [key: string]: never; }>;


export type AllDocsQuery = { __typename?: 'Query', allDocs?: Array<{ __typename?: 'Doc', id?: string | null, title?: string | null, summary?: string | null, order?: number | null, section?: { __typename?: 'Section', id?: string | null, title?: string | null, order?: number | null } | null } | null> | null };

export type DocByIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type DocByIdQuery = { __typename?: 'Query', Doc?: { __typename?: 'Doc', id?: string | null, title?: string | null, summary?: string | null, section?: { __typename?: 'Section', id?: string | null, title?: string | null } | null, related?: Array<{ __typename?: 'Doc', id?: string | null, title?: string | null, summary?: string | null } | null> | null, _content?: { __typename?: 'Doc__content', html?: string | null, timeToRead?: number | null } | null } | null };

export type AllPackagesQueryVariables = Exact<{ [key: string]: never; }>;


export type AllPackagesQuery = { __typename?: 'Query', allPackages?: Array<{ __typename?: 'Package', id?: string | null, _content?: { __typename?: 'Package__content', timeToRead?: number | null, excerpt?: string | null } | null } | null> | null };

export type PackageByIdQueryVariables = Exact<{
  id: Scalars['ID']['input'];
}>;


export type PackageByIdQuery = { __typename?: 'Query', Package?: { __typename?: 'Package', id?: string | null, _content?: { __typename?: 'Package__content', html?: string | null, timeToRead?: number | null } | null } | null };

export type SearchCorpusQueryVariables = Exact<{ [key: string]: never; }>;


export type SearchCorpusQuery = { __typename?: 'Query', allDocs?: Array<{ __typename?: 'Doc', id?: string | null, title?: string | null, summary?: string | null, section?: { __typename?: 'Section', id?: string | null, title?: string | null } | null, _content?: { __typename?: 'Doc__content', raw?: string | null } | null } | null> | null, allPackages?: Array<{ __typename?: 'Package', id?: string | null, _content?: { __typename?: 'Package__content', raw?: string | null } | null } | null> | null };


export const AllSectionsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AllSections"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allSections"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sortBy"},"value":{"kind":"StringValue","value":"order","block":false}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"EnumValue","value":"ASC"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"blurb"}}]}}]}}]} as unknown as DocumentNode<AllSectionsQuery, AllSectionsQueryVariables>;
export const AllDocsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AllDocs"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allDocs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sortBy"},"value":{"kind":"StringValue","value":"order","block":false}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"EnumValue","value":"ASC"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"order"}},{"kind":"Field","name":{"kind":"Name","value":"section"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"order"}}]}}]}}]}}]} as unknown as DocumentNode<AllDocsQuery, AllDocsQueryVariables>;
export const DocByIdDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"DocById"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"Doc"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"section"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}},{"kind":"Field","name":{"kind":"Name","value":"related"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}}]}},{"kind":"Field","name":{"kind":"Name","value":"_content"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"html"}},{"kind":"Field","name":{"kind":"Name","value":"timeToRead"}}]}}]}}]}}]} as unknown as DocumentNode<DocByIdQuery, DocByIdQueryVariables>;
export const AllPackagesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"AllPackages"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allPackages"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sortBy"},"value":{"kind":"StringValue","value":"id","block":false}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"EnumValue","value":"ASC"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"_content"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"timeToRead"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"length"},"value":{"kind":"IntValue","value":"30"}}]}]}}]}}]}}]} as unknown as DocumentNode<AllPackagesQuery, AllPackagesQueryVariables>;
export const PackageByIdDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"PackageById"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"ID"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"Package"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"_content"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"html"}},{"kind":"Field","name":{"kind":"Name","value":"timeToRead"}}]}}]}}]}}]} as unknown as DocumentNode<PackageByIdQuery, PackageByIdQueryVariables>;
export const SearchCorpusDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"SearchCorpus"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allDocs"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sortBy"},"value":{"kind":"StringValue","value":"order","block":false}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"EnumValue","value":"ASC"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"summary"}},{"kind":"Field","name":{"kind":"Name","value":"section"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}}]}},{"kind":"Field","name":{"kind":"Name","value":"_content"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"raw"}}]}}]}},{"kind":"Field","name":{"kind":"Name","value":"allPackages"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sortBy"},"value":{"kind":"StringValue","value":"id","block":false}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"EnumValue","value":"ASC"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"_content"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"raw"}}]}}]}}]}}]} as unknown as DocumentNode<SearchCorpusQuery, SearchCorpusQueryVariables>;

/* @flatbread/content-model-types:start */
/**
 * Flatbread content model types generated from flatbread.config.*.
 * These describe configured collections and refs before any GraphQL operation documents are required.
 */
export type FlatbreadCollectionName = "Doc" | "Section" | "Package";

export type FlatbreadRecordByCollection = {
  "Doc": Doc;
  "Section": Section;
  "Package": Package;
};

export type FlatbreadRelationTargetByCollection = {
  "Doc": {
    "section": { target: "Section"; cardinality: "one"; };
    "related": { target: "Doc"; cardinality: "many"; };
  };
  "Section": {};
  "Package": {};
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

export type FlatbreadReadableCollectionName = "Doc" | "Section" | "Package";

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
  "Doc": {
    all(selection?: string): Promise<ReadonlyArray<Partial<FlatbreadRecord<"Doc">>>>;
    find(id: string | number, selection?: string): Promise<Partial<FlatbreadRecord<"Doc">> | null>;
  };
  "Section": {
    all(selection?: string): Promise<ReadonlyArray<Partial<FlatbreadRecord<"Section">>>>;
    find(id: string | number, selection?: string): Promise<Partial<FlatbreadRecord<"Section">> | null>;
  };
  "Package": {
    all(selection?: string): Promise<ReadonlyArray<Partial<FlatbreadRecord<"Package">>>>;
    find(id: string | number, selection?: string): Promise<Partial<FlatbreadRecord<"Package">> | null>;
  };
};

const flatbreadReadApiQueries = {
  "Doc": { all: "allDocs", find: "Doc", idType: "ID", selection: "_filename\n_path\n_slug\nid\ntitle\nsection { _filename\n_path\n_slug\nid\ntitle\norder\nblurb\n_collection }\norder\nsummary\nrelated { _filename\n_path\n_slug\nid\ntitle\norder\nsummary\n_collection }\n_content { raw\nhtml\nexcerpt\ntimeToRead }\n_collection" },
  "Section": { all: "allSections", find: "Section", idType: "ID", selection: "_filename\n_path\n_slug\nid\ntitle\norder\nblurb\n_content { html\nexcerpt\ntimeToRead }\n_collection" },
  "Package": { all: "allPackages", find: "Package", idType: "ID", selection: "_filename\n_path\n_slug\nid\n_content { raw\nhtml\nexcerpt\ntimeToRead }\n_collection" }
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
