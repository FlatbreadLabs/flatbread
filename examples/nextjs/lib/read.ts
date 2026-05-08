import {
  createFlatbreadReadApi,
  type FlatbreadRecord,
  type FlatbreadRelationCardinality,
  type FlatbreadRelationTarget,
} from '../generated/graphql';
import { graphqlFetch } from './graphql';

export type PostAuthorsRelation = FlatbreadRelationTarget<'Post', 'authors'>;
export type PostAuthorsCardinality = FlatbreadRelationCardinality<
  'Post',
  'authors'
>;

export type PostsAuthorsTagsReadItem = Partial<
  Pick<FlatbreadRecord<'Post'>, 'id' | 'tags' | 'title'>
> & {
  authors?: PostAuthorsRelation;
};

const postAuthorsCardinality: PostAuthorsCardinality = 'many';

export const flatbreadRead = createFlatbreadReadApi(
  async <TData>(source: string, variables?: Record<string, unknown>) =>
    graphqlFetch<TData>(source, variables)
);

/**
 * Generated TypeScript read API example for the canonical onboarding model.
 *
 * The default GraphQL selection is generated inside `createFlatbreadReadApi`,
 * so this call site does not hand-write a GraphQL document or selection string.
 */
export async function getPostsAuthorsAndTagsViaReadApi(): Promise<
  ReadonlyArray<PostsAuthorsTagsReadItem>
> {
  const posts = await flatbreadRead.Post.all();

  if (postAuthorsCardinality !== 'many') {
    throw new Error('Expected Post.authors to be generated as a many relation.');
  }

  return posts.map((post) => ({
    authors: post?.authors,
    id: post?.id,
    tags: post?.tags,
    title: post?.title,
  }));
}

export async function getAuthorsViaReadApi(): Promise<
  ReadonlyArray<Partial<FlatbreadRecord<'Author'>>>
> {
  return flatbreadRead.Author.all();
}
