import {
  createFlatbreadReadApi,
  type FlatbreadRecord,
} from '../generated/graphql';
import { graphqlFetch } from './graphql';

export type DocPageRecord = Partial<FlatbreadRecord<'DocPage'>>;

export const flatbreadRead = createFlatbreadReadApi(
  async <TData>(source: string, variables?: Record<string, unknown>) =>
    graphqlFetch<TData>(source, variables)
);

/**
 * Every DocPage, sorted by `order`, with the summary fields the nav and
 * landing page need.
 */
export async function getAllDocPages(): Promise<ReadonlyArray<DocPageRecord>> {
  return flatbreadRead.DocPage.all();
}

/**
 * A single DocPage by its id (the frontmatter `id`, which we keep equal to the
 * file stem so it matches `_slug`).
 */
export async function getDocPageById(
  id: string
): Promise<DocPageRecord | null> {
  return flatbreadRead.DocPage.find(id);
}
