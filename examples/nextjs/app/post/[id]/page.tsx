import { graphqlFetch } from '../../../lib/graphql';
import type { PostCategory } from '../../../generated/graphql';
import PostDetail from '../../components/PostDetail';
import QueryPanel from '../../components/QueryPanel';
import { notFound } from 'next/navigation';

const GET_POST_BY_ID = `
  query GetPostById($id: String!) {
    allPostCategories(filter: { id: { eq: $id } }) {
      id
      title
      category
      rating
      authors {
        id
        name
        entity
        bio
        image {
          srcset
          srcsetavif
          srcsetwebp
          aspectratio
          placeholder
        }
      }
      _content {
        html
        excerpt
        timeToRead
      }
      _filename
      _path
    }
  }
`;

interface GetPostResponse {
  allPostCategories: (PostCategory | null)[] | null;
}

interface PostPageProps {
  params: Promise<{ id: string }>;
}

async function getPost(id: string): Promise<PostCategory | null> {
  try {
    const data = await graphqlFetch<GetPostResponse>(GET_POST_BY_ID, { id });
    return data.allPostCategories?.[0] || null;
  } catch (error) {
    console.error('Failed to load post:', error);
    return null;
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { id } = await params;
  const post = await getPost(id);

  if (!post) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="grid grid-cols-12 min-h-screen">
        {/* Main Content */}
        <main className="col-span-8 border-r-2 border-black">
          <PostDetail post={post} />
        </main>
        
        {/* Query Panel */}
        <aside className="col-span-4 bg-gray-50">
          <QueryPanel 
            query={GET_POST_BY_ID}
            data={{ allPostCategories: [post] }}
          />
        </aside>
      </div>
    </div>
  );
}