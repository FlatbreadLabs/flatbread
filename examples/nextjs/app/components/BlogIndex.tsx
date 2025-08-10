/**
 * Brutalist blog index component with clean typography and minimal design
 */

import Link from 'next/link';
import type { PostCategory, Author } from '../../generated/graphql';

interface BlogIndexProps {
  posts: (PostCategory | null)[];
}

function AuthorList({ authors }: { authors?: (Author | null)[] | null }) {
  if (!authors || authors.length === 0) return null;

  return (
    <div className="text-sm tracking-wide text-gray-600 uppercase">
      {authors.map((author, index) => {
        if (!author) return null;
        return (
          <span key={author.id || index}>
            {author.name}
            {index < authors.length - 1 && ', '}
          </span>
        );
      })}
    </div>
  );
}

function CategoryBadge({ category }: { category?: string | null }) {
  if (!category) return null;
  
  return (
    <span className="inline-block px-3 py-1 text-xs font-bold tracking-widest text-white uppercase bg-black">
      {category}
    </span>
  );
}

function RatingBar({ rating }: { rating?: number | null }) {
  if (!rating) return null;
  
  const percentage = Math.min(rating, 100);
  
  return (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-gray-200 border border-black">
        <div 
          className="h-full transition-all duration-300 bg-black"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <span className="font-mono text-xs font-bold">{rating}</span>
    </div>
  );
}

export default function BlogIndex({ posts }: BlogIndexProps) {
  const validPosts = posts.filter((post): post is PostCategory => 
    post !== null && post.id !== null && post.title !== null
  );

  if (validPosts.length === 0) {
    return (
      <div className="p-8">
        <div className="p-8 text-center border-4 border-black">
          <h2 className="mb-4 text-2xl font-bold tracking-widest uppercase">
            No Posts Found
          </h2>
          <p className="mb-4 text-gray-600">
            Start the Flatbread server to load content
          </p>
          <code className="px-4 py-2 font-mono text-sm bg-gray-100 border-2 border-black">
            npx flatbread dev
          </code>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 p-8 bg-white border-b-2 border-black">
        <h1 className="text-4xl font-bold tracking-widest uppercase">
          Blog
        </h1>
        <p className="mt-2 font-mono text-sm text-gray-600">
          {validPosts.length} posts indexed
        </p>
      </header>

      {/* Posts List */}
      <div className="divide-y-2 divide-black">
        {validPosts.map((post) => (
          <article 
            key={post.id} 
            className="p-8 transition-colors hover:bg-gray-50 group"
          >
            <div className="flex items-start justify-between gap-8">
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <CategoryBadge category={post.category} />
                  
                  <h2 className="text-2xl font-bold leading-tight group-hover:underline">
                    <Link 
                      href={`/post/${post.id}`}
                      className="decoration-4 underline-offset-4"
                    >
                      {post.title}
                    </Link>
                  </h2>
                  
                  <AuthorList authors={post.authors} />
                </div>

                {post._content?.excerpt && (
                  <p className="max-w-2xl leading-relaxed text-gray-700">
                    {post._content.excerpt}
                  </p>
                )}

                <div className="flex items-center gap-6 text-sm text-gray-500">
                  {post._content?.timeToRead && (
                    <span className="font-mono">
                      {post._content.timeToRead} min read
                    </span>
                  )}
                  
                  <Link 
                    href={`/post/${post.id}`}
                    className="font-bold tracking-wide uppercase transition-colors hover:text-black"
                  >
                    Read →
                  </Link>
                </div>
              </div>

              <div className="flex-shrink-0">
                <RatingBar rating={post.rating} />
              </div>
            </div>
          </article>
        ))}
      </div>

      {/* Footer */}
      <footer className="p-8 border-t-2 border-black bg-gray-50">
        <div className="text-center text-gray-600">
          <p className="font-mono text-sm">
            Powered by Flatbread • GraphQL • Next.js
          </p>
        </div>
      </footer>
    </div>
  );
}