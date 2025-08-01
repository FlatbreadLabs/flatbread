export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
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
  JSON: { input: Record<string, any>; output: Record<string, any>; }
};

export type Author = {
  __typename?: 'Author';
  /** The collection name */
  _collection?: Maybe<Scalars['String']['output']>;
  _content?: Maybe<Author__Content>;
  _filename?: Maybe<Scalars['String']['output']>;
  _path?: Maybe<Scalars['String']['output']>;
  _slug?: Maybe<Scalars['String']['output']>;
  date_joined?: Maybe<Scalars['Date']['output']>;
  enjoys?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  entity?: Maybe<Scalars['String']['output']>;
  /** The Author referenced by this Author */
  friend?: Maybe<Author>;
  id?: Maybe<Scalars['String']['output']>;
  image?: Maybe<Svimg>;
  name?: Maybe<Scalars['String']['output']>;
  skills?: Maybe<Author_Skills>;
};

export type Author_Skills = {
  __typename?: 'Author_Skills';
  breathing?: Maybe<Scalars['Float']['output']>;
  existence?: Maybe<Scalars['String']['output']>;
  liquid_consumption?: Maybe<Scalars['Float']['output']>;
  sitting?: Maybe<Scalars['Float']['output']>;
  sports?: Maybe<Scalars['Float']['output']>;
};

export type Author__Content = {
  __typename?: 'Author__content';
  /** A plaintext excerpt taken from the main content */
  excerpt?: Maybe<Scalars['String']['output']>;
  /** The content as HTML */
  html?: Maybe<Scalars['String']['output']>;
  raw?: Maybe<Scalars['String']['output']>;
  /** How long (in minutes) it would take an average reader to read the main content. */
  timeToRead?: Maybe<Scalars['Int']['output']>;
};


export type Author__ContentExcerptArgs = {
  length?: InputMaybe<Scalars['Int']['input']>;
};


export type Author__ContentTimeToReadArgs = {
  speed?: InputMaybe<Scalars['Int']['input']>;
};

export type Order =
  | 'ASC'
  | 'DESC';

export type OverrideTest = {
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
};

export type OverrideTest_Array2 = {
  __typename?: 'OverrideTest_Array2';
  obj?: Maybe<Scalars['String']['output']>;
};

export type OverrideTest_Array3 = {
  __typename?: 'OverrideTest_Array3';
  obj?: Maybe<OverrideTest_Array3_Obj>;
};

export type OverrideTest_Array3_Obj = {
  __typename?: 'OverrideTest_Array3_Obj';
  test?: Maybe<Scalars['String']['output']>;
};

export type OverrideTest_Deeply = {
  __typename?: 'OverrideTest_Deeply';
  nested?: Maybe<Scalars['String']['output']>;
};

export type OverrideTest__Content = {
  __typename?: 'OverrideTest__content';
  /** A plaintext excerpt taken from the main content */
  excerpt?: Maybe<Scalars['String']['output']>;
  /** The content as HTML */
  html?: Maybe<Scalars['String']['output']>;
  raw?: Maybe<Scalars['String']['output']>;
  /** How long (in minutes) it would take an average reader to read the main content. */
  timeToRead?: Maybe<Scalars['Int']['output']>;
};


export type OverrideTest__ContentExcerptArgs = {
  length?: InputMaybe<Scalars['Int']['input']>;
};


export type OverrideTest__ContentTimeToReadArgs = {
  speed?: InputMaybe<Scalars['Int']['input']>;
};

export type Post = {
  __typename?: 'Post';
  /** The collection name */
  _collection?: Maybe<Scalars['String']['output']>;
  _content?: Maybe<Post__Content>;
  _filename?: Maybe<Scalars['String']['output']>;
  _path?: Maybe<Scalars['String']['output']>;
  _slug?: Maybe<Scalars['String']['output']>;
  /** All Authors that are referenced by this Post */
  authors?: Maybe<Array<Maybe<Author>>>;
  id?: Maybe<Scalars['String']['output']>;
  rating?: Maybe<Scalars['Float']['output']>;
  title?: Maybe<Scalars['String']['output']>;
};


export type PostAuthorsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};

export type PostCategory = {
  __typename?: 'PostCategory';
  /** The collection name */
  _collection?: Maybe<Scalars['String']['output']>;
  _content?: Maybe<PostCategory__Content>;
  _filename?: Maybe<Scalars['String']['output']>;
  _path?: Maybe<Scalars['String']['output']>;
  _slug?: Maybe<Scalars['String']['output']>;
  /** All Authors that are referenced by this PostCategory */
  authors?: Maybe<Array<Maybe<Author>>>;
  category?: Maybe<Scalars['String']['output']>;
  id?: Maybe<Scalars['String']['output']>;
  rating?: Maybe<Scalars['Float']['output']>;
  slug?: Maybe<Scalars['String']['output']>;
  title?: Maybe<Scalars['String']['output']>;
};


export type PostCategoryAuthorsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};

export type PostCategoryBlob = {
  __typename?: 'PostCategoryBlob';
  /** The collection name */
  _collection?: Maybe<Scalars['String']['output']>;
  _content?: Maybe<PostCategoryBlob__Content>;
  _filename?: Maybe<Scalars['String']['output']>;
  _path?: Maybe<Scalars['String']['output']>;
  _slug?: Maybe<Scalars['String']['output']>;
  /** All Authors that are referenced by this PostCategoryBlob */
  authors?: Maybe<Array<Maybe<Author>>>;
  id?: Maybe<Scalars['String']['output']>;
  rating?: Maybe<Scalars['Float']['output']>;
  title?: Maybe<Scalars['String']['output']>;
};


export type PostCategoryBlobAuthorsArgs = {
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};

export type PostCategoryBlob__Content = {
  __typename?: 'PostCategoryBlob__content';
  /** A plaintext excerpt taken from the main content */
  excerpt?: Maybe<Scalars['String']['output']>;
  /** The content as HTML */
  html?: Maybe<Scalars['String']['output']>;
  raw?: Maybe<Scalars['String']['output']>;
  /** How long (in minutes) it would take an average reader to read the main content. */
  timeToRead?: Maybe<Scalars['Int']['output']>;
};


export type PostCategoryBlob__ContentExcerptArgs = {
  length?: InputMaybe<Scalars['Int']['input']>;
};


export type PostCategoryBlob__ContentTimeToReadArgs = {
  speed?: InputMaybe<Scalars['Int']['input']>;
};

export type PostCategory__Content = {
  __typename?: 'PostCategory__content';
  /** A plaintext excerpt taken from the main content */
  excerpt?: Maybe<Scalars['String']['output']>;
  /** The content as HTML */
  html?: Maybe<Scalars['String']['output']>;
  raw?: Maybe<Scalars['String']['output']>;
  /** How long (in minutes) it would take an average reader to read the main content. */
  timeToRead?: Maybe<Scalars['Int']['output']>;
};


export type PostCategory__ContentExcerptArgs = {
  length?: InputMaybe<Scalars['Int']['input']>;
};


export type PostCategory__ContentTimeToReadArgs = {
  speed?: InputMaybe<Scalars['Int']['input']>;
};

export type Post__Content = {
  __typename?: 'Post__content';
  /** A plaintext excerpt taken from the main content */
  excerpt?: Maybe<Scalars['String']['output']>;
  /** The content as HTML */
  html?: Maybe<Scalars['String']['output']>;
  raw?: Maybe<Scalars['String']['output']>;
  /** How long (in minutes) it would take an average reader to read the main content. */
  timeToRead?: Maybe<Scalars['Int']['output']>;
};


export type Post__ContentExcerptArgs = {
  length?: InputMaybe<Scalars['Int']['input']>;
};


export type Post__ContentTimeToReadArgs = {
  speed?: InputMaybe<Scalars['Int']['input']>;
};

export type Query = {
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
};


export type QueryAuthorArgs = {
  id?: InputMaybe<Scalars['String']['input']>;
};


export type QueryOverrideTestArgs = {
  id?: InputMaybe<Scalars['String']['input']>;
};


export type QueryPostArgs = {
  id?: InputMaybe<Scalars['String']['input']>;
};


export type QueryPostCategoryArgs = {
  id?: InputMaybe<Scalars['String']['input']>;
};


export type QueryPostCategoryBlobArgs = {
  id?: InputMaybe<Scalars['String']['input']>;
};


export type QueryYamlAuthorArgs = {
  id?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAllAuthorsArgs = {
  filter?: InputMaybe<Scalars['JSON']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAllOverrideTestsArgs = {
  filter?: InputMaybe<Scalars['JSON']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAllPostCategoriesArgs = {
  filter?: InputMaybe<Scalars['JSON']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAllPostCategoryBlobsArgs = {
  filter?: InputMaybe<Scalars['JSON']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAllPostsArgs = {
  filter?: InputMaybe<Scalars['JSON']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};


export type QueryAllYamlAuthorsArgs = {
  filter?: InputMaybe<Scalars['JSON']['input']>;
  limit?: InputMaybe<Scalars['Int']['input']>;
  order?: InputMaybe<Order>;
  skip?: InputMaybe<Scalars['Int']['input']>;
  sortBy?: InputMaybe<Scalars['String']['input']>;
};

/** An Image Optimized by Svimg */
export type Svimg = {
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
};

export type YamlAuthor = {
  __typename?: 'YamlAuthor';
  /** The collection name */
  _collection?: Maybe<Scalars['String']['output']>;
  _content?: Maybe<YamlAuthor__Content>;
  _filename?: Maybe<Scalars['String']['output']>;
  _path?: Maybe<Scalars['String']['output']>;
  _slug?: Maybe<Scalars['String']['output']>;
  date_joined?: Maybe<Scalars['Date']['output']>;
  enjoys?: Maybe<Array<Maybe<Scalars['String']['output']>>>;
  /** The YamlAuthor referenced by this YamlAuthor */
  friend?: Maybe<YamlAuthor>;
  id?: Maybe<Scalars['String']['output']>;
  name?: Maybe<Scalars['String']['output']>;
  skills?: Maybe<YamlAuthor_Skills>;
};

export type YamlAuthor_Skills = {
  __typename?: 'YamlAuthor_Skills';
  breathing?: Maybe<Scalars['Float']['output']>;
  cat_pat?: Maybe<Scalars['Float']['output']>;
  existence?: Maybe<Scalars['String']['output']>;
  liquid_consumption?: Maybe<Scalars['Float']['output']>;
  sitting?: Maybe<Scalars['Float']['output']>;
  sports?: Maybe<Scalars['Float']['output']>;
};

export type YamlAuthor__Content = {
  __typename?: 'YamlAuthor__content';
  /** A plaintext excerpt taken from the main content */
  excerpt?: Maybe<Scalars['String']['output']>;
  /** The content as HTML */
  html?: Maybe<Scalars['String']['output']>;
  /** How long (in minutes) it would take an average reader to read the main content. */
  timeToRead?: Maybe<Scalars['Int']['output']>;
};


export type YamlAuthor__ContentExcerptArgs = {
  length?: InputMaybe<Scalars['Int']['input']>;
};


export type YamlAuthor__ContentTimeToReadArgs = {
  speed?: InputMaybe<Scalars['Int']['input']>;
};
