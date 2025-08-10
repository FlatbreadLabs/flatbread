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
  ID: { input: string; output: string; }
  /** The `String` scalar type represents textual data, represented as UTF-8 character sequences. The String type is most often used by GraphQL to represent free-form human-readable text. */
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  /** The `Int` scalar type represents non-fractional signed whole numeric values. Int can represent values between -(2^31) and 2^31 - 1. */
  Int: { input: number; output: number; }
  /** The `Float` scalar type represents signed double-precision fractional values as specified by [IEEE 754](https://en.wikipedia.org/wiki/IEEE_floating_point). */
  Float: { input: number; output: number; }
  Date: { input: string; output: string; }
  /** The `JSON` scalar type represents JSON values as specified by [ECMA-404](http://www.ecma-international.org/publications/files/ECMA-ST/ECMA-404.pdf). */
  JSON: { input: Record<string, unknown>; output: Record<string, unknown>; }
}

export interface Author {
  __typename?: 'Author';
  /** The collection name */
  _collection?: Maybe<Scalars['String']['output']>;
  _content?: Maybe<Author__Content>;
  _filename?: Maybe<Scalars['String']['output']>;
  _path?: Maybe<Scalars['String']['output']>;
  _slug?: Maybe<Scalars['String']['output']>;
  bio?: Maybe<Scalars['String']['output']>;
  certifications?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  current_survivors?: Maybe<Scalars['Float']['output']>;
  date_joined?: Maybe<Scalars['Date']['output']>;
  enjoys?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  entity?: Maybe<Scalars['String']['output']>;
  favorite_activities?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  favorite_technologies?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** The Author referenced by this Author */
  friend?: Maybe<Author>;
  id?: Maybe<Scalars['String']['output']>;
  image?: Maybe<Svimg>;
  location?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  plant_murder_count?: Maybe<Scalars['Float']['output']>;
  plant_store_reputation?: Maybe<Scalars['String']['output']>;
  pronouns?: Maybe<Scalars['String']['output']>;
  skills?: Maybe<Author_Skills>;
}

export interface Author_Skills {
  __typename?: 'Author_Skills';
  breathing?: Maybe<Scalars['Float']['output']>;
  debugging?: Maybe<Scalars['Float']['output']>;
  existence?: Maybe<Scalars['String']['output']>;
  keyboard_walking?: Maybe<Scalars['Float']['output']>;
  liquid_consumption?: Maybe<Scalars['Float']['output']>;
  meeting_interruption?: Maybe<Scalars['Float']['output']>;
  optimistic_plant_purchasing?: Maybe<Scalars['Float']['output']>;
  plant_care?: Maybe<Scalars['Float']['output']>;
  sitting?: Maybe<Scalars['Float']['output']>;
  sports?: Maybe<Scalars['Float']['output']>;
}

export interface Author__Content {
  __typename?: 'Author__content';
  /** A plaintext excerpt taken from the main content */
  excerpt?: Maybe<Scalars['String']['output']>;
  /** The content as HTML */
  html?: Maybe<Scalars['String']['output']>;
  raw?: Maybe<Scalars['String']['output']>;
  /** How long (in minutes) it would take an average reader to read the main content. */
  timeToRead?: Maybe<Scalars['Int']['output']>;
}


export interface Author__ContentExcerptArgs {
  length?: InputMaybe<Scalars['Int']['input']>;
}


export interface Author__ContentTimeToReadArgs {
  speed?: InputMaybe<Scalars['Int']['input']>;
}

export type Order =
  | 'ASC'
  | 'DESC';

export interface OverrideTest {
  __typename?: 'OverrideTest';
  /** The collection name */
  _collection?: Maybe<Scalars['String']['output']>;
  _content?: Maybe<OverrideTest__Content>;
  _filename?: Maybe<Scalars['String']['output']>;
  _path?: Maybe<Scalars['String']['output']>;
  _slug?: Maybe<Scalars['String']['output']>;
  array?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  array2?: Maybe<Array<Maybe<OverrideTest_Array2>>>;
  array3?: Maybe<Array<Maybe<OverrideTest_Array3>>>;
  deeply?: Maybe<OverrideTest_Deeply>;
  id?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
}

export interface OverrideTest_Array2 {
  __typename?: 'OverrideTest_Array2';
  obj?: Maybe<Scalars['String']['output']>;
}

export interface OverrideTest_Array3 {
  __typename?: 'OverrideTest_Array3';
  obj?: Maybe<OverrideTest_Array3_Obj>;
}

export interface OverrideTest_Array3_Obj {
  __typename?: 'OverrideTest_Array3_Obj';
  test?: Maybe<Scalars['String']['output']>;
}

export interface OverrideTest_Deeply {
  __typename?: 'OverrideTest_Deeply';
  nested?: Maybe<Scalars['String']['output']>;
}

export interface OverrideTest__Content {
  __typename?: 'OverrideTest__content';
  /** A plaintext excerpt taken from the main content */
  excerpt?: Maybe<Scalars['String']['output']>;
  /** The content as HTML */
  html?: Maybe<Scalars['String']['output']>;
  raw?: Maybe<Scalars['String']['output']>;
  /** How long (in minutes) it would take an average reader to read the main content. */
  timeToRead?: Maybe<Scalars['Int']['output']>;
}


export interface OverrideTest__ContentExcerptArgs {
  length?: InputMaybe<Scalars['Int']['input']>;
}


export interface OverrideTest__ContentTimeToReadArgs {
  speed?: InputMaybe<Scalars['Int']['input']>;
}

export interface Post {
  __typename?: 'Post';
  /** The collection name */
  _collection?: Maybe<Scalars['String']['output']>;
  _content?: Maybe<Post__Content>;
  _filename?: Maybe<Scalars['String']['output']>;
  _path?: Maybe<Scalars['String']['output']>;
  _slug?: Maybe<Scalars['String']['output']>;
  /** All Authors that are referenced by this Post */
  authors?: Maybe<Array<Maybe<Author>>>;
  category?: Maybe<Scalars['String']['output']>;
  controversial_opinions?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  id?: Maybe<Scalars['String']['output']>;
  rating?: Maybe<Scalars['Float']['output']>;
  research_duration?: Maybe<Scalars['String']['output']>;
  slurp_factor?: Maybe<Scalars['String']['output']>;
  soups_tested?: Maybe<Scalars['Float']['output']>;
  tags?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  temperature_preference?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
}


export interface PostAuthorsArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
}

export interface PostCategory {
  __typename?: 'PostCategory';
  /** The collection name */
  _collection?: Maybe<Scalars['String']['output']>;
  _content?: Maybe<PostCategory__Content>;
  _filename?: Maybe<Scalars['String']['output']>;
  _path?: Maybe<Scalars['String']['output']>;
  _slug?: Maybe<Scalars['String']['output']>;
  attempts?: Maybe<Scalars['Float']['output']>;
  /** All Authors that are referenced by this PostCategory */
  authors?: Maybe<Array<Maybe<Author>>>;
  bread_types_tested?: Maybe<Scalars['Float']['output']>;
  bug_severity?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  bugs_encountered?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  butter_temperature?: Maybe<Scalars['String']['output']>;
  category?: Maybe<Scalars['String']['output']>;
  coffee_consumed?: Maybe<Scalars['String']['output']>;
  current_survivors?: Maybe<Scalars['Float']['output']>;
  debugging_attempts?: Maybe<Array<Maybe<PostCategory_Debugging_Attempts>>>;
  difficulty?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  plant_types_attempted?: Maybe<Array<Maybe<PostCategory_Plant_Types_Attempted>>>;
  plants_murdered?: Maybe<Scalars['Float']['output']>;
  precision_level?: Maybe<Scalars['String']['output']>;
  rating?: Maybe<Scalars['Float']['output']>;
  sanity_level?: Maybe<Scalars['String']['output']>;
  slug?: Maybe<Scalars['String']['output']>;
  success_rate?: Maybe<Scalars['String']['output']>;
  time_spent?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  toast_settings?: Maybe<PostCategory_Toast_Settings>;
  watering_schedule?: Maybe<Scalars['String']['output']>;
}


export interface PostCategoryAuthorsArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
}

export interface PostCategoryBlob {
  __typename?: 'PostCategoryBlob';
  /** The collection name */
  _collection?: Maybe<Scalars['String']['output']>;
  _content?: Maybe<PostCategoryBlob__Content>;
  _filename?: Maybe<Scalars['String']['output']>;
  _path?: Maybe<Scalars['String']['output']>;
  _slug?: Maybe<Scalars['String']['output']>;
  attempts?: Maybe<Scalars['Float']['output']>;
  /** All Authors that are referenced by this PostCategoryBlob */
  authors?: Maybe<Array<Maybe<Author>>>;
  bread_types_tested?: Maybe<Scalars['Float']['output']>;
  bug_severity?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  bugs_encountered?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  butter_temperature?: Maybe<Scalars['String']['output']>;
  category?: Maybe<Scalars['String']['output']>;
  coffee_consumed?: Maybe<Scalars['String']['output']>;
  current_survivors?: Maybe<Scalars['Float']['output']>;
  debugging_attempts?: Maybe<Array<Maybe<PostCategoryBlob_Debugging_Attempts>>>;
  difficulty?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  plant_types_attempted?: Maybe<Array<Maybe<PostCategoryBlob_Plant_Types_Attempted>>>;
  plants_murdered?: Maybe<Scalars['Float']['output']>;
  precision_level?: Maybe<Scalars['String']['output']>;
  rating?: Maybe<Scalars['Float']['output']>;
  sanity_level?: Maybe<Scalars['String']['output']>;
  success_rate?: Maybe<Scalars['String']['output']>;
  time_spent?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
  toast_settings?: Maybe<PostCategoryBlob_Toast_Settings>;
  watering_schedule?: Maybe<Scalars['String']['output']>;
}


export interface PostCategoryBlobAuthorsArgs {
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
}

export interface PostCategoryBlob_Debugging_Attempts {
  __typename?: 'PostCategoryBlob_Debugging_attempts';
  prayer_to_tech_gods?: Maybe<Scalars['String']['output']>;
  ritual_coffee_sacrifice?: Maybe<Scalars['String']['output']>;
  rubber_duck_debugging?: Maybe<Scalars['String']['output']>;
  stack_overflow_diving?: Maybe<Scalars['String']['output']>;
}

export interface PostCategoryBlob_Plant_Types_Attempted {
  __typename?: 'PostCategoryBlob_Plant_types_attempted';
  bamboo?: Maybe<Scalars['String']['output']>;
  herbs?: Maybe<Scalars['String']['output']>;
  snake_plant?: Maybe<Scalars['String']['output']>;
  succulents?: Maybe<Scalars['String']['output']>;
}

export interface PostCategoryBlob_Toast_Settings {
  __typename?: 'PostCategoryBlob_Toast_settings';
  butter_distribution?: Maybe<Scalars['String']['output']>;
  crunch_factor?: Maybe<Scalars['String']['output']>;
  darkness?: Maybe<Scalars['Float']['output']>;
}

export interface PostCategoryBlob__Content {
  __typename?: 'PostCategoryBlob__content';
  /** A plaintext excerpt taken from the main content */
  excerpt?: Maybe<Scalars['String']['output']>;
  /** The content as HTML */
  html?: Maybe<Scalars['String']['output']>;
  raw?: Maybe<Scalars['String']['output']>;
  /** How long (in minutes) it would take an average reader to read the main content. */
  timeToRead?: Maybe<Scalars['Int']['output']>;
}


export interface PostCategoryBlob__ContentExcerptArgs {
  length?: InputMaybe<Scalars['Int']['input']>;
}


export interface PostCategoryBlob__ContentTimeToReadArgs {
  speed?: InputMaybe<Scalars['Int']['input']>;
}

export interface PostCategory_Debugging_Attempts {
  __typename?: 'PostCategory_Debugging_attempts';
  prayer_to_tech_gods?: Maybe<Scalars['String']['output']>;
  ritual_coffee_sacrifice?: Maybe<Scalars['String']['output']>;
  rubber_duck_debugging?: Maybe<Scalars['String']['output']>;
  stack_overflow_diving?: Maybe<Scalars['String']['output']>;
}

export interface PostCategory_Plant_Types_Attempted {
  __typename?: 'PostCategory_Plant_types_attempted';
  bamboo?: Maybe<Scalars['String']['output']>;
  herbs?: Maybe<Scalars['String']['output']>;
  snake_plant?: Maybe<Scalars['String']['output']>;
  succulents?: Maybe<Scalars['String']['output']>;
}

export interface PostCategory_Toast_Settings {
  __typename?: 'PostCategory_Toast_settings';
  butter_distribution?: Maybe<Scalars['String']['output']>;
  crunch_factor?: Maybe<Scalars['String']['output']>;
  darkness?: Maybe<Scalars['Float']['output']>;
}

export interface PostCategory__Content {
  __typename?: 'PostCategory__content';
  /** A plaintext excerpt taken from the main content */
  excerpt?: Maybe<Scalars['String']['output']>;
  /** The content as HTML */
  html?: Maybe<Scalars['String']['output']>;
  raw?: Maybe<Scalars['String']['output']>;
  /** How long (in minutes) it would take an average reader to read the main content. */
  timeToRead?: Maybe<Scalars['Int']['output']>;
}


export interface PostCategory__ContentExcerptArgs {
  length?: InputMaybe<Scalars['Int']['input']>;
}


export interface PostCategory__ContentTimeToReadArgs {
  speed?: InputMaybe<Scalars['Int']['input']>;
}

export interface Post__Content {
  __typename?: 'Post__content';
  /** A plaintext excerpt taken from the main content */
  excerpt?: Maybe<Scalars['String']['output']>;
  /** The content as HTML */
  html?: Maybe<Scalars['String']['output']>;
  raw?: Maybe<Scalars['String']['output']>;
  /** How long (in minutes) it would take an average reader to read the main content. */
  timeToRead?: Maybe<Scalars['Int']['output']>;
}


export interface Post__ContentExcerptArgs {
  length?: InputMaybe<Scalars['Int']['input']>;
}


export interface Post__ContentTimeToReadArgs {
  speed?: InputMaybe<Scalars['Int']['input']>;
}

export interface Query {
  __typename?: 'Query';
  /** Find one Author by its ID */
  Author?: Maybe<Author>;
  /** Find one OverrideTest by its ID */
  OverrideTest?: Maybe<OverrideTest>;
  /** Find one Post by its ID */
  Post?: Maybe<Post>;
  /** Find one PostCategory by its ID */
  PostCategory?: Maybe<PostCategory>;
  /** Find one PostCategoryBlob by its ID */
  PostCategoryBlob?: Maybe<PostCategoryBlob>;
  /** Find one YamlAuthor by its ID */
  YamlAuthor?: Maybe<YamlAuthor>;
  /** Return a set of Authors */
  allAuthors?: Maybe<Array<Maybe<Author>>>;
  /** Return a set of OverrideTests */
  allOverrideTests?: Maybe<Array<Maybe<OverrideTest>>>;
  /** Return a set of PostCategories */
  allPostCategories?: Maybe<Array<Maybe<PostCategory>>>;
  /** Return a set of PostCategoryBlobs */
  allPostCategoryBlobs?: Maybe<Array<Maybe<PostCategoryBlob>>>;
  /** Return a set of Posts */
  allPosts?: Maybe<Array<Maybe<Post>>>;
  /** Return a set of YamlAuthors */
  allYamlAuthors?: Maybe<Array<Maybe<YamlAuthor>>>;
}


export interface QueryAuthorArgs {
  id?: InputMaybe<Scalars['String']['input']>;
}


export interface QueryOverrideTestArgs {
  id?: InputMaybe<Scalars['String']['input']>;
}


export interface QueryPostArgs {
  id?: InputMaybe<Scalars['String']['input']>;
}


export interface QueryPostCategoryArgs {
  id?: InputMaybe<Scalars['String']['input']>;
}


export interface QueryPostCategoryBlobArgs {
  id?: InputMaybe<Scalars['String']['input']>;
}


export interface QueryYamlAuthorArgs {
  id?: InputMaybe<Scalars['String']['input']>;
}


export interface QueryAllAuthorsArgs {
  filter?: InputMaybe<Scalars['JSON']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
}


export interface QueryAllOverrideTestsArgs {
  filter?: InputMaybe<Scalars['JSON']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
}


export interface QueryAllPostCategoriesArgs {
  filter?: InputMaybe<Scalars['JSON']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
}


export interface QueryAllPostCategoryBlobsArgs {
  filter?: InputMaybe<Scalars['JSON']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
}


export interface QueryAllPostsArgs {
  filter?: InputMaybe<Scalars['JSON']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
}


export interface QueryAllYamlAuthorsArgs {
  filter?: InputMaybe<Scalars['JSON']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
}

/** An Image Optimized by Svimg */
export interface Svimg {
  __typename?: 'Svimg';
  /** Aspect ratio of image */
  aspectratio?: Maybe<Scalars['Float']['output']>;
  /** inline blurred placeholder image -- returns null if disabled via skipPlaceholder: true in config */
  placeholder?: Maybe<Scalars['String']['output']>;
  /** Responsive images and widths */
  srcset?: Maybe<Scalars['String']['output']>;
  /** Responsive Avif images and widths -- returns null if disabled via avif: false in config */
  srcsetavif?: Maybe<Scalars['String']['output']>;
  /** Responsive WebP images and widths -- returns null if disabled via webp: false in config */
  srcsetwebp?: Maybe<Scalars['String']['output']>;
}

export interface YamlAuthor {
  __typename?: 'YamlAuthor';
  /** The collection name */
  _collection?: Maybe<Scalars['String']['output']>;
  _content?: Maybe<YamlAuthor__Content>;
  _filename?: Maybe<Scalars['String']['output']>;
  _path?: Maybe<Scalars['String']['output']>;
  _slug?: Maybe<Scalars['String']['output']>;
  bio?: Maybe<Scalars['String']['output']>;
  certifications?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  coffee_consumption_daily?: Maybe<Scalars['String']['output']>;
  current_projects?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  date_joined?: Maybe<Scalars['String']['output']>;
  education?: Maybe<Scalars['String']['output']>;
  enjoys?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  entity?: Maybe<Scalars['String']['output']>;
  favorite_brewing_methods?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  favorite_technologies?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** The YamlAuthor referenced by this YamlAuthor */
  friend?: Maybe<YamlAuthor>;
  id?: Maybe<Scalars['String']['output']>;
  location?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  pronouns?: Maybe<Scalars['String']['output']>;
  research_focus?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  skills?: Maybe<YamlAuthor_Skills>;
}

export interface YamlAuthor_Skills {
  __typename?: 'YamlAuthor_Skills';
  breathing?: Maybe<Scalars['Float']['output']>;
  cat_pat?: Maybe<Scalars['Float']['output']>;
  coffee_brewing?: Maybe<Scalars['Float']['output']>;
  data_analysis?: Maybe<Scalars['Float']['output']>;
  existence?: Maybe<Scalars['String']['output']>;
  liquid_consumption?: Maybe<Scalars['Float']['output']>;
  sitting?: Maybe<Scalars['Float']['output']>;
  sports?: Maybe<Scalars['Float']['output']>;
  spreadsheet_mastery?: Maybe<Scalars['Float']['output']>;
}

export interface YamlAuthor__Content {
  __typename?: 'YamlAuthor__content';
  /** A plaintext excerpt taken from the main content */
  excerpt?: Maybe<Scalars['String']['output']>;
  /** The content as HTML */
  html?: Maybe<Scalars['String']['output']>;
  /** How long (in minutes) it would take an average reader to read the main content. */
  timeToRead?: Maybe<Scalars['Int']['output']>;
}


export interface YamlAuthor__ContentExcerptArgs {
  length?: InputMaybe<Scalars['Int']['input']>;
}


export interface YamlAuthor__ContentTimeToReadArgs {
  speed?: InputMaybe<Scalars['Int']['input']>;
}

export type GetAllPostsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAllPostsQuery = { __typename?: 'Query', allPosts?: Array<{ __typename?: 'Post', id?: string | null, title?: string | null, _content?: { __typename?: 'Post__content', html?: string | null, excerpt?: string | null, timeToRead?: number | null } | null, authors?: Array<{ __typename?: 'Author', id?: string | null, name?: string | null } | null> | null } | null> | null };

export type GetPostByIdQueryVariables = Exact<{
  id: Scalars['String']['input'];
}>;


export type GetPostByIdQuery = { __typename?: 'Query', Post?: { __typename?: 'Post', id?: string | null, title?: string | null, _content?: { __typename?: 'Post__content', html?: string | null, excerpt?: string | null, timeToRead?: number | null } | null, authors?: Array<{ __typename?: 'Author', id?: string | null, name?: string | null, friend?: { __typename?: 'Author', id?: string | null, name?: string | null } | null } | null> | null } | null };

export type GetPostCategoriesQueryVariables = Exact<{ [key: string]: never; }>;


export type GetPostCategoriesQuery = { __typename?: 'Query', allPostCategories?: Array<{ __typename?: 'PostCategory', _collection?: string | null, _filename?: string | null, _slug?: string | null, id?: string | null, title?: string | null, category?: string | null, slug?: string | null, rating?: number | null, _content?: { __typename?: 'PostCategory__content', raw?: string | null, html?: string | null, excerpt?: string | null, timeToRead?: number | null } | null, authors?: Array<{ __typename?: 'Author', _slug?: string | null, id?: string | null, name?: string | null, entity?: string | null, enjoys?: Array<string | null> | null, date_joined?: string | null, image?: { __typename?: 'Svimg', srcset?: string | null, srcsetwebp?: string | null, srcsetavif?: string | null, placeholder?: string | null, aspectratio?: number | null } | null, friend?: { __typename?: 'Author', name?: string | null, date_joined?: string | null } | null, skills?: { __typename?: 'Author_Skills', sitting?: number | null, breathing?: number | null, liquid_consumption?: number | null, existence?: string | null, sports?: number | null } | null } | null> | null } | null> | null };

export type GetAuthorsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetAuthorsQuery = { __typename?: 'Query', allAuthors?: Array<{ __typename?: 'Author', id?: string | null, name?: string | null, entity?: string | null, enjoys?: Array<string | null> | null, date_joined?: string | null, image?: { __typename?: 'Svimg', srcset?: string | null, srcsetwebp?: string | null, srcsetavif?: string | null, placeholder?: string | null, aspectratio?: number | null } | null, skills?: { __typename?: 'Author_Skills', sitting?: number | null, breathing?: number | null, liquid_consumption?: number | null, existence?: string | null, sports?: number | null } | null } | null> | null };

export type PostsummaryFragment = { __typename?: 'Post', id?: string | null, title?: string | null, _content?: { __typename?: 'Post__content', html?: string | null, excerpt?: string | null, timeToRead?: number | null } | null, authors?: Array<{ __typename?: 'Author', id?: string | null, name?: string | null } | null> | null };

export const PostsummaryFragmentDoc = {"kind":"Document","definitions":[{"kind":"FragmentDefinition","name":{"kind":"Name","value":"Postsummary"},"typeCondition":{"kind":"NamedType","name":{"kind":"Name","value":"Post"}},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"_content"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"html"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"timeToRead"}}]}},{"kind":"Field","name":{"kind":"Name","value":"authors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]} as unknown as DocumentNode<PostsummaryFragment, unknown>;
export const GetAllPostsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAllPosts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allPosts"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"_content"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"html"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"timeToRead"}}]}},{"kind":"Field","name":{"kind":"Name","value":"authors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]} as unknown as DocumentNode<GetAllPostsQuery, GetAllPostsQueryVariables>;
export const GetPostByIdDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPostById"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"id"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"Post"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"id"},"value":{"kind":"Variable","name":{"kind":"Name","value":"id"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"_content"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"html"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"timeToRead"}}]}},{"kind":"Field","name":{"kind":"Name","value":"authors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"friend"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetPostByIdQuery, GetPostByIdQueryVariables>;
export const GetPostCategoriesDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetPostCategories"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allPostCategories"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"sortBy"},"value":{"kind":"StringValue","value":"title","block":false}},{"kind":"Argument","name":{"kind":"Name","value":"order"},"value":{"kind":"EnumValue","value":"DESC"}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_collection"}},{"kind":"Field","name":{"kind":"Name","value":"_filename"}},{"kind":"Field","name":{"kind":"Name","value":"_slug"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"title"}},{"kind":"Field","name":{"kind":"Name","value":"category"}},{"kind":"Field","name":{"kind":"Name","value":"slug"}},{"kind":"Field","name":{"kind":"Name","value":"rating"}},{"kind":"Field","name":{"kind":"Name","value":"_content"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"raw"}},{"kind":"Field","name":{"kind":"Name","value":"html"}},{"kind":"Field","name":{"kind":"Name","value":"excerpt"}},{"kind":"Field","name":{"kind":"Name","value":"timeToRead"}}]}},{"kind":"Field","name":{"kind":"Name","value":"authors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"_slug"}},{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"entity"}},{"kind":"Field","name":{"kind":"Name","value":"enjoys"}},{"kind":"Field","name":{"kind":"Name","value":"image"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"srcset"}},{"kind":"Field","name":{"kind":"Name","value":"srcsetwebp"}},{"kind":"Field","name":{"kind":"Name","value":"srcsetavif"}},{"kind":"Field","name":{"kind":"Name","value":"placeholder"}},{"kind":"Field","name":{"kind":"Name","value":"aspectratio"}}]}},{"kind":"Field","name":{"kind":"Name","value":"friend"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"date_joined"}}]}},{"kind":"Field","name":{"kind":"Name","value":"date_joined"}},{"kind":"Field","name":{"kind":"Name","value":"skills"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sitting"}},{"kind":"Field","name":{"kind":"Name","value":"breathing"}},{"kind":"Field","name":{"kind":"Name","value":"liquid_consumption"}},{"kind":"Field","name":{"kind":"Name","value":"existence"}},{"kind":"Field","name":{"kind":"Name","value":"sports"}}]}}]}}]}}]}}]} as unknown as DocumentNode<GetPostCategoriesQuery, GetPostCategoriesQueryVariables>;
export const GetAuthorsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetAuthors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"allAuthors"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"entity"}},{"kind":"Field","name":{"kind":"Name","value":"enjoys"}},{"kind":"Field","name":{"kind":"Name","value":"image"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"srcset"}},{"kind":"Field","name":{"kind":"Name","value":"srcsetwebp"}},{"kind":"Field","name":{"kind":"Name","value":"srcsetavif"}},{"kind":"Field","name":{"kind":"Name","value":"placeholder"}},{"kind":"Field","name":{"kind":"Name","value":"aspectratio"}}]}},{"kind":"Field","name":{"kind":"Name","value":"date_joined"}},{"kind":"Field","name":{"kind":"Name","value":"skills"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"sitting"}},{"kind":"Field","name":{"kind":"Name","value":"breathing"}},{"kind":"Field","name":{"kind":"Name","value":"liquid_consumption"}},{"kind":"Field","name":{"kind":"Name","value":"existence"}},{"kind":"Field","name":{"kind":"Name","value":"sports"}}]}}]}}]}}]} as unknown as DocumentNode<GetAuthorsQuery, GetAuthorsQueryVariables>;