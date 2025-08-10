/**
 * Brutalist 404 page for missing posts
 */

import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-white">
      <div className="max-w-lg p-8 mx-auto">
        <div className="p-8 space-y-6 text-center bg-white border-4 border-black">
          <div className="space-y-2">
            <h1 className="font-mono text-6xl font-bold">404</h1>
            <h2 className="text-2xl font-bold tracking-widest uppercase">
              Post Not Found
            </h2>
          </div>
          
          <div className="space-y-4">
            <p className="leading-relaxed text-gray-600">
              The post you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
            
            <div className="p-4 bg-gray-100 border-2 border-black">
              <p className="font-mono text-sm text-gray-700">
                Check the URL or navigate back to the blog index.
              </p>
            </div>
          </div>

          <Link 
            href="/"
            className="inline-block px-6 py-3 font-bold tracking-wider text-white uppercase transition-colors bg-black hover:bg-gray-800"
          >
            ← Back to Blog
          </Link>
        </div>
      </div>
    </div>
  );
}