/**
 * Brutalist 404 page for missing posts
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="max-w-lg mx-auto p-8">
        <div className="border-4 border-black p-8 text-center space-y-6 bg-white">
          <div className="space-y-2">
            <h1 className="text-6xl font-bold font-mono">404</h1>
            <h2 className="text-2xl font-bold uppercase tracking-widest">
              Post Not Found
            </h2>
          </div>
          
          <div className="space-y-4">
            <p className="text-gray-600 leading-relaxed">
              The post you're looking for doesn't exist or has been moved.
            </p>
            
            <div className="border-2 border-black bg-gray-100 p-4">
              <p className="text-sm font-mono text-gray-700">
                Check the URL or navigate back to the blog index.
              </p>
            </div>
          </div>

          <Link 
            href="/"
            className="inline-block bg-black text-white px-6 py-3 font-bold uppercase tracking-wider hover:bg-gray-800 transition-colors"
          >
            ← Back to Blog
          </Link>
        </div>
      </div>
    </div>
  );
}