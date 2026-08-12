import type { NextConfig } from 'next';

/**
 * The docs site reads every record from Flatbread while it builds, then ships
 * as plain files. Nothing calls the GraphQL server once the build is done.
 */
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
