import { graphqlFetch, queries } from '../lib/graphql';
import type { PostCategory } from '../src/generated/graphql';
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
  const data = await getData();

  return (
    <div className="min-h-screen bg-white">
      <div className="grid min-h-screen grid-cols-12">
        {/* Main Content */}
        <main className="col-span-8 border-r-2 border-black">
          <BlogIndex posts={data.allPostCategories || []} />
        </main>
        
        {/* Query Panel */}
        <aside className="col-span-4 bg-gray-50">
          <QueryPanel 
            query={queries.GET_POST_CATEGORIES}
            data={data}
          />
        </aside>
      </div>
    </div>
  );
}
