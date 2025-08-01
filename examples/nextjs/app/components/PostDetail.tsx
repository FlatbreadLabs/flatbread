/**
 * Individual post detail component with brutalist typography and layout
 */

import Link from 'next/link';
import type { PostCategory, Author } from '../../src/generated/graphql';

interface PostDetailProps {
  post: PostCategory;
}

function AuthorCard({ author }: { author: Author }) {
  if (!author) return null;

  return (
    <div className="border-2 border-black p-4 bg-white">
      <div className="flex items-start gap-4">
        {author.image && (
          <div className="w-16 h-16 border-2 border-black bg-gray-100 flex-shrink-0">
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
                  src={author.image.srcset.split(' ')[0]}
                  alt={author.name || 'Author'}
                  className="w-full h-full object-cover"
                  style={{ aspectRatio: author.image.aspectratio || 1 }}
                />
              </picture>
            )}
          </div>
        )}
        
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-lg">{author.name}</h3>
          {author.entity && (
            <p className="text-xs text-gray-600 uppercase tracking-wide font-mono">
              {author.entity}
            </p>
          )}
          {author.bio && (
            <p className="text-sm text-gray-700 mt-2 leading-relaxed">
              {author.bio}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function CategoryBadge({ category }: { category?: string | null }) {
  if (!category) return null;
  
  return (
    <span className="inline-block px-4 py-2 text-sm font-bold uppercase tracking-widest bg-black text-white">
      {category}
    </span>
  );
}

function RatingDisplay({ rating }: { rating?: number | null }) {
  if (!rating) return null;
  
  const percentage = Math.min(rating, 100);
  
  return (
    <div className="border-2 border-black p-4 bg-gray-50">
      <div className="text-xs uppercase tracking-widest font-bold text-gray-600 mb-2">
        Quality Rating
      </div>
      <div className="flex items-center gap-4">
        <div className="flex-1 h-4 bg-white border-2 border-black">
          <div 
            className="h-full bg-black transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className="text-2xl font-bold font-mono">{rating}</span>
      </div>
    </div>
  );
}

export default function PostDetail({ post }: PostDetailProps) {
  return (
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="border-b-2 border-black p-6 bg-white sticky top-0 z-10">
        <Link 
          href="/"
          className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider hover:bg-black hover:text-white px-3 py-2 transition-colors"
        >
          ← Back to Blog
        </Link>
      </nav>

      {/* Article Header */}
      <header className="border-b-2 border-black p-8 bg-white">
        <div className="space-y-6">
          <CategoryBadge category={post.category} />
          
          <h1 className="text-4xl lg:text-5xl font-bold leading-tight">
            {post.title}
          </h1>
          
          <div className="flex items-center gap-6 text-sm text-gray-600">
            {post._content?.timeToRead && (
              <span className="font-mono">
                {post._content.timeToRead} min read
              </span>
            )}
            {post._filename && (
              <span className="font-mono">
                {post._filename}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Article Content */}
      <article className="p-8">
        <div className="max-w-4xl space-y-8">
          {/* Excerpt */}
          {post._content?.excerpt && (
            <div className="border-l-4 border-black pl-6">
              <p className="text-xl text-gray-700 leading-relaxed italic">
                {post._content.excerpt}
              </p>
            </div>
          )}

          {/* Main Content */}
          {post._content?.html && (
            <div className="space-y-6">
              <div 
                className="prose prose-lg max-w-none prose-headings:font-bold prose-headings:uppercase prose-headings:tracking-wider prose-h1:text-3xl prose-h2:text-2xl prose-h3:text-xl prose-p:leading-relaxed prose-code:bg-gray-100 prose-code:border prose-code:border-gray-300 prose-code:px-2 prose-code:py-1 prose-pre:bg-gray-100 prose-pre:border-2 prose-pre:border-black prose-pre:p-4 prose-blockquote:border-l-4 prose-blockquote:border-black prose-blockquote:pl-6 prose-blockquote:italic prose-table:border-2 prose-table:border-black prose-th:border prose-th:border-black prose-th:bg-gray-100 prose-th:p-3 prose-th:font-bold prose-th:uppercase prose-th:tracking-wide prose-td:border prose-td:border-black prose-td:p-3"
                dangerouslySetInnerHTML={{ __html: post._content.html }}
              />
            </div>
          )}

          {/* Rating */}
          <RatingDisplay rating={post.rating} />

          {/* Authors */}
          {post.authors && post.authors.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold uppercase tracking-wider border-b-2 border-black pb-2">
                Authors
              </h2>
              <div className="grid gap-4">
                {post.authors.map((author) => {
                  if (!author) return null;
                  return <AuthorCard key={author.id} author={author} />;
                })}
              </div>
            </div>
          )}
        </div>
      </article>

      {/* Footer */}
      <footer className="border-t-2 border-black p-8 bg-gray-50">
        <div className="text-center">
          <Link 
            href="/"
            className="inline-flex items-center gap-2 text-lg font-bold uppercase tracking-wider bg-black text-white px-6 py-3 hover:bg-gray-800 transition-colors"
          >
            ← Return to Blog
          </Link>
        </div>
      </footer>
    </div>
  );
}