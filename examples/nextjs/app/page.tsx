import { graphqlFetch, queries } from '../lib/graphql';
import { getAuthorsViaReadApi, getPostsAuthorsAndTagsViaReadApi } from '../lib/read';
import type { PostCategory } from '../generated/graphql';
import BlogIndex from './components/BlogIndex';
import QueryPanel from './components/QueryPanel';

interface GetPostCategoriesResponse {
  allPostCategories: (PostCategory | null)[] | null;
}

async function getData(): Promise<GetPostCategoriesResponse> {
  try {
    const data = await graphqlFetch<GetPostCategoriesResponse>(queries.GET_POST_CATEGORIES);
    return data;
  } catch (error) {
    console.error('Failed to load data:', error);
    return { allPostCategories: [] };
  }
}

export default async function Home() {
  const [data, readApiResults] = await Promise.all([
    getData(),
    Promise.allSettled([
      getPostsAuthorsAndTagsViaReadApi(),
      getAuthorsViaReadApi(),
    ]),
  ]);
  const [readApiPostsResult, readApiAuthorsResult] = readApiResults;
  const readApiError =
    readApiPostsResult.status === 'rejected' ||
    readApiAuthorsResult.status === 'rejected'
      ? {
          posts:
            readApiPostsResult.status === 'rejected'
              ? String(readApiPostsResult.reason)
              : undefined,
          authors:
            readApiAuthorsResult.status === 'rejected'
              ? String(readApiAuthorsResult.reason)
              : undefined,
        }
      : undefined;
  const readApiPosts =
    readApiPostsResult.status === 'fulfilled' ? readApiPostsResult.value : [];
  const readApiAuthors =
    readApiAuthorsResult.status === 'fulfilled' ? readApiAuthorsResult.value : [];

  return (
    <div className="relative min-h-screen bg-white">
      <div className="grid min-h-screen grid-cols-12">
        {/* Main Content */}
        <main className="col-span-8 border-r-2 border-black">
          <BlogIndex posts={data.allPostCategories || []} />
        </main>
        
        {/* Query Panel */}
          <QueryPanel 
            query={queries.GET_POST_CATEGORIES}
            data={{ ...data, readApiAuthors, readApiError, readApiPosts }}
          />
      </div>
    </div>
  );
}
