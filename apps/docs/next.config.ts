import type { NextConfig } from 'next';

function normalizeBasePath(value: string | undefined) {
  const path = value?.replace(/^\/+|\/+$/g, '') ?? '';
  return path ? `/${path}` : '';
}

const basePath = normalizeBasePath(process.env.NEXT_PUBLIC_BASE_PATH);

/**
 * The docs site reads every record from Flatbread while it builds, then ships
 * as plain files. Nothing calls the GraphQL server once the build is done.
 */
const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  basePath,
  env: { NEXT_PUBLIC_BASE_PATH: basePath },
  images: { unoptimized: true },
  // The monorepo lints with Prettier and type-checks with tsc. Next's own lint
  // step would load the root ESLint 7 config, which cannot parse this app.
  eslint: { ignoreDuringBuilds: true },
};

export default nextConfig;
