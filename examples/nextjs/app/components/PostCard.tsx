/**
 * Post card component using generated GraphQL types
 */

import type { PostCategory, Author } from '../../generated/graphql';

interface PostCardProps {
  post: PostCategory;
}

function AuthorList({ authors }: { authors?: (Author | null)[] | null }) {
  if (!authors || authors.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {authors.map((author) => {
        if (!author) return null;
        
        return (
          <div key={author.id} className="flex items-center gap-2">
            {author.image && (
              <div className="w-8 h-8 overflow-hidden bg-gray-200 rounded-full">
                {author.image.srcset && (
                  <picture>
                    {author.image.srcsetavif && (
                      <source srcSet={author.image.srcsetavif} type="image/avif" />
                    )}
                    {author.image.srcsetwebp && (
                      <source srcSet={author.image.srcsetwebp} type="image/webp" />
                    )}
                    <img
                      srcSet={author.image.srcset}
                      src={author.image.srcset.split(' ')[0]} // Fallback src
                      alt={author.name || 'Author'}
                      className="object-cover w-full h-full"
                      style={{ aspectRatio: author.image.aspectratio || 1 }}
                    />
                  </picture>
                )}
              </div>
            )}
            <span className="text-xs font-medium text-gray-700">
              {author.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function PostCard({ post }: PostCardProps) {
  return (
    <article className="p-4 m-3 transition-shadow border border-gray-200 rounded-lg shadow-sm bg-gray-50 hover:shadow-md">
      <h3 className="mb-2 text-xl font-medium text-gray-900">{post.title}</h3>
      
      <div className="mb-3 space-y-2">
        <AuthorList authors={post.authors} />
        
        {post.rating && (
          <div className="text-xs font-semibold text-gray-500">
            Rating: {post.rating}
          </div>
        )}
        
        {post.category && (
          <div className="inline-block px-2 py-1 text-xs font-semibold text-blue-600 rounded bg-blue-50">
            {post.category}
          </div>
        )}

        {post._content?.timeToRead && (
          <div className="text-xs text-gray-500">
            {post._content.timeToRead} min read
          </div>
        )}
      </div>

      {post._content?.excerpt && (
        <p className="mb-3 text-sm text-gray-600 line-clamp-3">
          {post._content.excerpt}
        </p>
      )}

      {post._content?.html && (
        <div 
          className="prose-sm prose text-gray-800 max-w-none"
          dangerouslySetInnerHTML={{ __html: post._content.html }}
        />
      )}
    </article>
  );
}